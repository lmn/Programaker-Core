import { AtomicFlowBlock, AtomicFlowBlockData, AtomicFlowBlockOptions } from './atomic_flow_block';
import { BaseToolboxDescription, ToolboxDescription } from './base_toolbox_description';
import { BASE_TOOLBOX_SOURCE_SIGNALS } from './definitions';
import { DirectValue, DirectValueFlowBlockData } from './direct_value';
import { EnumDirectValue, EnumDirectValueFlowBlockData } from './enum_direct_value';
import { CompiledBlock, CompiledBlockArg, CompiledBlockArgs, CompiledFlowGraph, ContentBlock, FlowGraph, FlowGraphEdge, FlowGraphNode } from './flow_graph';
import { TIME_MONITOR_ID } from './platform_facilities';


function index_toolbox_description(desc: ToolboxDescription): {[key: string]: AtomicFlowBlockOptions} {
    const result: {[key: string]: AtomicFlowBlockOptions} = {};

    for (const cat of desc) {
        for (const block of cat.blocks) {
            result[block.block_function] = block;
        }
    }

    return result;
}

const BASE_TOOLBOX_BLOCKS = index_toolbox_description(BaseToolboxDescription);

const JUMP_TO_POSITION_OPERATION = 'jump_to_position';
const JUMP_TO_BLOCK_OPERATION = 'jump_to_block';
const FORK_OPERATION = 'op_fork_execution';

function get_source_blocks(graph: FlowGraph): string[] {
    const sources = [];
    for (const block_id of Object.keys(graph.nodes)) {
        const block = graph.nodes[block_id];
        if (block.data.type === AtomicFlowBlock.GetBlockType()){
            const data = block.data as AtomicFlowBlockData;

            const inputs = data.value.options.inputs || [];

            // If it has no pulse inputs its a source block
            if (inputs.filter(v => v.type === 'pulse').length === 0) {
                sources.push(block_id);
            }
        }
        else if (block.data.type === DirectValue.GetBlockType()){
            sources.push(block_id);
        }
        else if (block.data.type === EnumDirectValue.GetBlockType()){
            sources.push(block_id);
        }
    }

    return sources;
}

function makes_reachable(conn: FlowGraphEdge, block: FlowGraphNode): boolean {
    if (block.data.type === AtomicFlowBlock.GetBlockType()){
        const data = block.data as AtomicFlowBlockData;

        const input = data.value.options.inputs[conn.to.input_index];
        if (!input) {
            const extras = data.value.options.extra_inputs;
            if (extras) {
                return extras.type === 'pulse';
            }

            throw new Error(`No input #${conn.to.input_index} on ${JSON.stringify(data.value.options.inputs)} [conn: ${JSON.stringify(conn)}]`);
        }

        return input.type === 'pulse';
    }
    else if (block.data.type === DirectValue.GetBlockType()){
        return true;
    }
    else if (block.data.type === EnumDirectValue.GetBlockType()){
        return true;
    }
}

function build_index(arr: string[]): { [key:string]: boolean} {
    const index = {};
    for (const element of arr) {
        index[element] = true;
    }

    return index;
}

function set_difference(whole: any[], subset: {[key: string]: boolean}|string[]): any[] {
    const result = [];
    if (subset.map) { // Is an array
        subset = build_index(subset as string[]);
    }

    for (const element of whole) {
        if (!subset[element]) {
            result.push(element);
        }
    }

    return result;
}

export function get_unreachable(graph: FlowGraph): string[] {
    const reached = build_index(get_source_blocks(graph));

    let remaining_connections: FlowGraphEdge[] = [].concat(graph.edges);
    let empty_pass = false;

    do {
        empty_pass = true;

        const skipped: FlowGraphEdge[] = [];
        for (const conn of remaining_connections) {
            if (reached[conn.from.id]) {
                // Connection activated
                if (makes_reachable(conn, graph.nodes[conn.to.id])) {
                    empty_pass = false;
                    reached[conn.to.id] = true;
                }
            }
            else {
                skipped.push(conn);
            }
        }

        remaining_connections = skipped;
    } while (!empty_pass);

    return set_difference(Object.keys(graph.nodes), reached);
}

export function get_source_signals(graph: FlowGraph): string[] {
    const signals = [];

    for (const block_id of Object.keys(graph.nodes)) {
        const block = graph.nodes[block_id];
        if (block.data.type === AtomicFlowBlock.GetBlockType()){
            const data = block.data as AtomicFlowBlockData;

            const inputs = data.value.options.inputs || [];

            // If it has any pulse input, its not a source block
            if (inputs.filter(v => v.type === 'pulse').length > 0) {
                continue;
            }

            if (BASE_TOOLBOX_SOURCE_SIGNALS.indexOf(data.value.options.block_function) >= 0) {
                signals.push(block_id);
            }
        }
    }

    return signals;
}

function has_pulse_output(block: FlowGraphNode): boolean {
    if (block.data.type === AtomicFlowBlock.GetBlockType()){
        const data = block.data as AtomicFlowBlockData;

        const outputs = data.value.options.outputs || [];

        // If it has no pulse inputs its a source block
        return outputs.filter(v => v.type === 'pulse').length > 0;
    }
    else if (block.data.type === DirectValue.GetBlockType()){
        const data = block.data as DirectValueFlowBlockData;

        return data.value.type === 'pulse';
    }
    else if (block.data.type === EnumDirectValue.GetBlockType()){
        return false;
    }
    else {
        throw new Error("Unknown block type: " + block.data.type)
    }
}

function is_pulse_output(block: FlowGraphNode, index: number): boolean {
    if (block.data.type === AtomicFlowBlock.GetBlockType()){
        const data = block.data as AtomicFlowBlockData;

        const outputs = data.value.options.outputs;
        if (!outputs[index]) {
            throw new Error(`IndexError: Index (${index}) not found on outputs (${JSON.stringify(outputs)})`)
        }

        // If it has no pulse inputs its a source block
        return outputs[index].type === 'pulse';
    }
    else if (block.data.type === DirectValue.GetBlockType()){
        const data = block.data as DirectValueFlowBlockData;

        return data.value.type === 'pulse';
    }
    else if (block.data.type === EnumDirectValue.GetBlockType()){
        return false;
    }
    else {
        throw new Error("Unknown block type: " + block.data.type)
    }
}

export function get_conversions_to_stepped(graph: FlowGraph, source_block_id: string): string[] {
    const results = {};
    const reached = build_index([source_block_id]);

    let remaining_connections: FlowGraphEdge[] = [].concat(graph.edges);
    let empty_pass = false;

    do {
        empty_pass = true;

        const skipped: FlowGraphEdge[] = [];
        for (const conn of remaining_connections) {
            if (reached[conn.from.id]) {
                if (has_pulse_output(graph.nodes[conn.to.id])) {
                    // Conversor to step
                    results[conn.to.id] = true;
                }
                else {
                    // Part of the streaming flow
                    empty_pass = false;
                    reached[conn.to.id] = true;
                }
            }
            else {
                skipped.push(conn);
            }
        }

        remaining_connections = skipped;
    } while (!empty_pass);

    return Object.keys(results);
}

export function get_pulse_continuations(graph: FlowGraph, source_id: string): FlowGraphEdge[][] {
    const outputs: {[key: string]: FlowGraphEdge}[] = [];

    const block = graph.nodes[source_id];

    for (const conn of graph.edges) {
        if (conn.from.id === source_id) {
            if (is_pulse_output(block, conn.from.output_index)) {
                if (!outputs[conn.from.output_index]) {
                    outputs[conn.from.output_index] = {};
                }
                outputs[conn.from.output_index][conn.to.input_index + '_' + conn.to.id] = conn;
            }
        }
    }

    return outputs.map(conn_set => Object.values(conn_set));
}

export interface BlockTreeArgument {
    tree: BlockTree, output_index: number
};

export interface BlockTree {
    block_id: string,
    arguments: BlockTreeArgument[],
};

export interface SteppedBlockTreeBlock extends BlockTree  {
    contents: SteppedBlockTree[],
};

export interface VirtualSteppedBlock {
    block_id: string,
    type: string,
    contents?: SteppedBlockTree[],
    arguments?: BlockTreeArgument[],
}

export interface SteppedBlockTreeJump extends VirtualSteppedBlock {
    block_id: string,
    type: 'jump_to_block';
}

export interface SteppedBlockTreeFork extends VirtualSteppedBlock {
    block_id: string,
    type: 'op_fork_execution',
    contents: SteppedBlockTree[],
}

export type SteppedBlockTree = SteppedBlockTreeBlock | VirtualSteppedBlock;

export function get_tree_with_ends(graph: FlowGraph, top: string, bottom: string): BlockTree {
    const args: FlowGraphEdge[] = [];

    for (const conn of graph.edges) {
        if (conn.to.id === bottom) {
            if (args[conn.to.input_index] !== undefined) {
                throw new Error("Multiple inputs on single port");
            }

            args[conn.to.input_index] = conn;
        }
    }

    return {
        block_id: bottom,
        arguments: args.map(conn => {
            if (conn) {
                return {
                    tree: get_tree_with_ends(graph, top, conn.from.id),
                    output_index: conn.from.output_index,
                };
            }
            else {
                return null;
            }
        })
    };
}

export function get_filters(graph: FlowGraph, source_block_id: string): BlockTree[] {
    const conversions = get_conversions_to_stepped(graph, source_block_id);

    return conversions.map((bottom_id) => {
        return get_tree_with_ends(graph, source_block_id, bottom_id)
    });
}

export function get_stepped_block_arguments(graph: FlowGraph, block_id: string): BlockTreeArgument[] {
    const args: BlockTreeArgument[] = [];

    let pulse_offset = 0;
    let pulse_ports = {};

    for (const conn of graph.edges) {

        if (conn.to.id === block_id) {
            if (is_pulse_output(graph.nodes[conn.from.id], conn.from.output_index)) {
                pulse_ports[conn.to.input_index] = true;
                pulse_offset = Math.max(pulse_offset, conn.to.input_index + 1);
            }
            else {
                pulse_ports[conn.to.input_index] = false;

                if (args[conn.to.input_index] !== undefined) {
                    throw new Error("Multiple inputs on single port");
                }

                args[conn.to.input_index] = {
                    tree: {
                        block_id: conn.from.id,
                        arguments: get_stepped_block_arguments(graph, conn.from.id),
                    },
                    output_index: conn.from.output_index,
                };
            }
        }
    }

    // Validate that all pulse's are grouped
    for (let i = 0; i < pulse_offset; i++) {
        if (pulse_ports[i]) {
            args.shift();
        }
        else {
            throw new Error(`Non-pulse input before a pulse one on block_id:${block_id}`);
        }
    }

    return args;
}

function get_stepped_ast_continuation(graph: FlowGraph,
                                      continuation: FlowGraphEdge,
                                      ast: SteppedBlockTree[],
                                      reached: {[key: string]: boolean}) {

    const block_id = continuation.to.id;

    if (reached[block_id]) {
        // Create new jump-to block here

        ast.push({
            block_id: block_id,
            type: JUMP_TO_BLOCK_OPERATION
        });
    }
    else {
        ast.push({
            block_id: block_id,
            arguments: get_stepped_block_arguments(graph, block_id),
            contents: [],
        });

        reached[block_id] = true;
        get_stepped_ast_branch(graph, block_id, ast, reached);
    }
}

function cut_on_block_id(ast: SteppedBlockTree[], block_id: string): [SteppedBlockTree[], SteppedBlockTree[]] {
    for (let cut_idx = 0;cut_idx < ast.length; cut_idx++) {
        if (ast[cut_idx].block_id === block_id) {
            return [
                ast.slice(0, cut_idx),
                ast.slice(cut_idx),
            ];
        }
    }

    throw new Error(`Block (id: ${block_id}) not found`);
}

function find_common_merge(asts: SteppedBlockTree[][]): { asts: SteppedBlockTree[][], common_suffix: SteppedBlockTree[] } {
    const findings: { [key: string]: number[]} = {};
    const common_blocks: [string, number][] = [];

    if (asts.length === 0) {
        return null;
    }

    for (let idx = 0; idx < asts.length; idx++) {
        const ast = asts[idx];

        for (let op_idx = 0; op_idx < ast.length; op_idx++) {
            const op = ast[op_idx];

            const block_id = op.block_id;
            if (!findings[block_id]) {
                findings[block_id] = [];
            }

            findings[block_id].push(op_idx);
            if (findings[block_id].length === asts.length) {
                common_blocks.push([block_id, findings[block_id].reduce((a, b) => a + b, 0)]);
            }
            else if (findings[block_id].length > asts.length) {
                throw new Error(`Duplicated block (id=${block_id}) found on ast`);
            }
        }
    }

    if (common_blocks.length === 0) {
        return null;
    }

    const sorted_ascending = common_blocks.sort((a, b) => a[1] - b[1]);
    const first_cut_id = sorted_ascending[0][0];

    const [unique_first_ast, common_suffix] = cut_on_block_id(asts[0], first_cut_id);

    const differences = [unique_first_ast];
    for (let idx = 1; idx < asts.length; idx++) {
        const [unique, ] = cut_on_block_id(asts[idx], first_cut_id);
        differences.push(unique);
    }

    return {
        asts: differences,
        common_suffix: common_suffix,
    }
}

function get_stepped_ast_branch(graph: FlowGraph, source_id: string, ast: SteppedBlockTree[], reached: {[key: string]: boolean}) {
    let continuations = get_pulse_continuations(graph, source_id);

    if (continuations.length > 1) {
        let contents = [];

        for (const cont of continuations) {
            const subast = [];

            if (cont.length !== 1) {
                throw new Error(`There should be one and only one pulse per output`)
            }

            const subreached = Object.assign({}, reached)
            get_stepped_ast_continuation(graph, cont[0], subast, subreached);
            contents.push(subast);
        }

        const re_merge_data = find_common_merge(contents);
        let common_suffix = [];

        if (re_merge_data) {
            contents = re_merge_data.asts;
            common_suffix = re_merge_data.common_suffix;
        }
        ast[ast.length - 1].contents = contents; // Update parent block contents
        for (const op of common_suffix) {
            ast.push(op);
        }
    }


    if (continuations.length == 1) {
        if (continuations[0].length == 1) {
            get_stepped_ast_continuation(graph, continuations[0][0], ast, reached);
        }
        else {
            throw new Error(`Multiple outputs pulses from the same port`);
        }
    }
    else if (continuations.length == 0) {
        // Empty AST
        // Nothing to do
    }
}

export function get_stepped_ast(graph: FlowGraph, source_id: string): SteppedBlockTree[] {
    const result: SteppedBlockTree[] = [];

    get_stepped_ast_branch(graph, source_id, result, {source_id: true})

    return result;
}

function compile_contents(graph: FlowGraph, contents: SteppedBlockTree[]): CompiledBlock[] {
    return contents.map(v =>
        compile_block(graph, v.block_id, v.arguments, v.contents, { inside_args: false, orig_tree: v })
                       );
}

function is_signal_block(_graph: FlowGraph, _arg: BlockTreeArgument, data: AtomicFlowBlockData): boolean {
    if (data.value.options.block_function === 'flow_utc_time') {
        return true;
    }

    return false;
}

function compile_arg(graph: FlowGraph, arg: BlockTreeArgument): CompiledBlockArg {
    const block = graph.nodes[arg.tree.block_id];

    if (block.data.type === AtomicFlowBlock.GetBlockType()){
        const data = block.data as AtomicFlowBlockData;

        if (is_signal_block(graph, arg, data)) {
            return {
                type: 'block',
                value: [
                    {
                        type: 'flow_last_value',
                        contents: [],
                        args: [
                            {
                                type: 'constant',
                                value: arg.tree.block_id,
                            },
                            {
                                type: 'constant',
                                value: arg.output_index + '',
                            }
                        ]
                    }
                ]
            }
        }
        else{
            return {
                type: 'block',
                value: [ compile_block(graph, arg.tree.block_id, arg.tree.arguments, [], { inside_args: true, orig_tree: null }) ]
            }
        }
    }
    else if (block.data.type === DirectValue.GetBlockType()){
        const data = block.data as DirectValueFlowBlockData;

        return {
            type: 'constant',
            value: data.value.value,
        };
    }
    else if (block.data.type === EnumDirectValue.GetBlockType()){
        const data = block.data as EnumDirectValueFlowBlockData;

        return {
            type: 'constant',
            value: data.value.value_id,
        };
    }
    else {
        throw new Error("Unknown block type: " + block.data.type)
    }
}

function compile_block(graph: FlowGraph,
                       block_id: string,
                       args: BlockTreeArgument[],
                       contents: SteppedBlockTree[][] | SteppedBlockTree[],
                       flags: { inside_args: boolean, orig_tree: SteppedBlockTree }): CompiledBlock {

    if (flags.orig_tree && (flags.orig_tree as VirtualSteppedBlock).type) {
        const vblock = flags.orig_tree as VirtualSteppedBlock;

        if (vblock.type === 'jump_to_block') {
            return {
                type: JUMP_TO_BLOCK_OPERATION,
                args: [{ type: 'constant', value: block_id }],
                contents: [],
            };
        }
        else if (vblock.type === 'op_fork_execution') {
            return {
                type: FORK_OPERATION,
                args: [],
                contents: (contents as SteppedBlockTree[][]).map(c => { return { contents: compile_contents(graph, c)} })
            };
        }
        else {
            throw new Error(`Unknown virtual block (type: ${vblock.type})`);
        }
    }

    const block = graph.nodes[block_id];

    if (!block) {
        if (flags) {
            throw new Error(`Block not found (id: ${block_id}, inside_args: ${flags.inside_args})\nValue: ${JSON.stringify(flags.orig_tree)}`)
        }
        else {
            throw new Error(`Block not found (id: ${block_id}, no flags)`)
        }
    }

    if (block.data.type === AtomicFlowBlock.GetBlockType()){
        const data = block.data as AtomicFlowBlockData;

        let compiled_contents = [];
        if (contents && contents.length) {
            if (flags.inside_args) {
                throw new Error("Found block with contents inside args");
            }

            if (contents.length > 0) {
                if ((contents as SteppedBlockTree[][])[0].length) {
                    compiled_contents = (contents as SteppedBlockTree[][]).map(v => {
                        return {
                            contents: compile_contents(graph, v)
                        }
                    })
                }
                else {
                    compiled_contents = compile_contents(graph, contents as SteppedBlockTree[]);
                }
            }
        }

        let block_type = null;
        let compiled_args: CompiledBlockArgs = args.map(v => compile_arg(graph, v));
        const block_fun = data.value.options.block_function;

        if (block_fun === 'flow_utc_time') {
            block_type = "wait_for_monitor";
            compiled_args = {
                monitor_id: {
                    from_service: TIME_MONITOR_ID,
                },
                expected_value: 'any_value',
            };
        }
        else if (block_fun.startsWith('services.')) {
            block_type = "command_call_service";
            const [, bridge_id, call_name] = block_fun.split('.');
            compiled_args = {
                service_id: bridge_id,
                service_action: call_name,
                service_call_values: compiled_args,
            };
        }
        else if (block_fun.startsWith('flow_equals')) {
            block_type = "operator_equals";
        }
        else if (block_fun === 'trigger_when_all_true') {
            block_type = "control_if_else";

            // Tie arguments with an *and* operation
            compiled_args = [{
                type: 'block',
                value: [{
                    type: "operator_and",
                    contents: [],
                    args: compiled_args,
                }],
            }];
        }
        else if (BASE_TOOLBOX_BLOCKS[block_fun]) {
            block_type = block_fun;
        }
        else {
            throw new Error("Unknown block: " + block_fun);
        }

        return {
            id: block_id,
            type: block_type,
            args: compiled_args,
            contents: compiled_contents,
        };
    }
    else if (block.data.type === DirectValue.GetBlockType()){
        const data = block.data as DirectValueFlowBlockData;

        if (contents.length > 0) {
            throw new Error("AssertionError: Contents.length > 0 in DirectValue block")
        }

        return {
            type: 'constant',
            value: data.value.value,

            // Not really a compiled block, this would be an argument, but this simplifies things
        } as any as CompiledBlock;
    }
    else if (block.data.type === EnumDirectValue.GetBlockType()){
        const data = block.data as EnumDirectValueFlowBlockData;

        if (contents.length > 0) {
            throw new Error("AssertionError: Contents.length > 0 in EnumDirectValue block")
        }

        return {
            type: 'constant',
            value: data.value.value_id,

            // Not really a compiled block, this would be an argument, but this simplifies things
        } as any as CompiledBlock;
    }
    else {
        throw new Error("Unknown block type: " + block.data.type)
    }
}

type BlockPositionIndex = {[key: string]: number[]};

function process_jump_index_on_contents(contents: (CompiledBlock | ContentBlock)[],
                                        index: BlockPositionIndex,
                                        prefix: number[]) {

    for (let idx = 0; idx < contents.length; idx++) {
        const op = contents[idx];

        if ((op as CompiledBlock).type === 'jump_point') {
            const block = (op as CompiledBlock);
            index[block.args[0].value] = prefix.concat([idx])

            // Remove this operation
            contents.splice(idx, 1);
            idx--;

            if (op.contents && op.contents.length) {
                throw new Error('Jump point must not have contents');
            }
        }
        else if ((op as CompiledBlock).id) {
            const block = (op as CompiledBlock);
            index[block.id] = prefix.concat([idx])
        }
        op.contents = process_jump_index_on_contents(op.contents || [], index, prefix.concat([idx]));
    }

    return contents;
}

function process_graph_jump_index(graph: CompiledFlowGraph): BlockPositionIndex {
    const index: BlockPositionIndex = {};
    process_jump_index_on_contents(graph, index, []);

    return index;
}

function link_jumps(contents: (CompiledBlock | ContentBlock)[], positions: BlockPositionIndex) {
    for (const op of contents) {

        if ((op as CompiledBlock).type === JUMP_TO_BLOCK_OPERATION) {
            const block = (op as CompiledBlock);

            const link = (op as CompiledBlock).args[0].value as string;
            block.type = JUMP_TO_POSITION_OPERATION;
            if (!positions[link]) {
                throw new Error(`Cannot link to "${link}"`)
            }

            block.args[0].value = positions[link];
        }

        link_jumps(op.contents || [], positions);
    }
}

export function _link_graph(graph: CompiledFlowGraph): CompiledFlowGraph {
    const block_id_index = process_graph_jump_index(graph);

    link_jumps(graph, block_id_index);

    return graph;
}

export function assemble_flow(graph: FlowGraph,
                              signal_id: string,
                              filter: BlockTree,
                              stepped_ast: SteppedBlockTree[]): CompiledFlowGraph {

    const compiled_graph = [
        compile_block(graph, signal_id, [], [], { inside_args: false, orig_tree: null }),
        compile_block(graph, filter.block_id, filter.arguments, [ stepped_ast, [] ], { inside_args: false, orig_tree: null })
    ];

    return _link_graph(compiled_graph);
}

export function compile(graph: FlowGraph): CompiledFlowGraph[] {
    const source_signals = get_source_signals(graph);
    const filters: BlockTree[][] = [];
    for (const signal_id of source_signals) {
        filters.push(get_filters(graph, signal_id));
    }

    const stepped_asts = [];
    for (const subfilters of filters) {
        let columns = [];

        for (const subfilter of subfilters) {
            columns.push(get_stepped_ast(graph, subfilter.block_id));
        }

        stepped_asts.push(columns);
    }

    // Finally assemble everything
    const flows: CompiledFlowGraph[] = [];
    for (let i = 0; i < source_signals.length; i++) {
        const signal_id = source_signals[i];

        for (let j = 0; j < filters[i].length; j++) {
            const filter = filters[i][j];
            const ast = stepped_asts[i][j];
            flows.push(assemble_flow(graph, signal_id, filter, ast));
        }
    }

    return flows;
}
