import { FlowGraph } from '../../../flow-editor/flow_graph';
import { validate } from '../../../flow-editor/graph_validation';
import { GraphBuilder } from '../scaffolding/graph-analysis-tools-graph-builder';
import { compile } from '../../../flow-editor/graph_analysis';
import { dsl_to_ast } from '../scaffolding/graph-analysis-tools-ast-dsl';
import { TIME_MONITOR_ID } from '../../../flow-editor/platform_facilities';
import { are_equivalent_ast } from './utils.spec';
import { gen_compiled } from '../scaffolding/graph-analysis-tools';

export function gen_flow(): FlowGraph {
    const builder = new GraphBuilder();

    // Stream section
    const source = builder.add_stream('flow_utc_time', {id: 'source', message: 'UTC time'});
    const cond = builder.add_stream('operator_equals', {args: [[source, 0], 11]});

    // Stepped section
    const trigger = builder.add_trigger('trigger_when_all_true', {args: [[cond, 0]]});

    const branch1 = builder.add_op('control_wait', { id: 'branch1',
                                                        args: [ 1 ]
                                                      });

    const branch2 = builder.add_op('control_wait', { id: 'branch2',
                                                        args: [ 2 ]
                                                      });

    builder.add_fork(trigger, [branch1, branch2]);

    // Join branch 1 and 2
    const if_true = builder.add_op('control_wait', { args: [ 3 ] });
    const if_false = builder.add_op('control_wait', { args: [ 4 ] });

    branch2.then_id(builder.add_if(if_true, if_false, { cond: [cond, 0] }))


    const joiner = builder.add_trigger('trigger_when_all_completed', {args: [[branch1, 'pulse'], [ if_true, 'pulse' ], [if_false, 'pulse']]});
    joiner.then(f => f.add_op('control_wait', { args: [ 9 ] }));

    const graph = builder.build();
    return graph;
}

describe('Flow-21-04: Fork then IF, close merging ALL (fail: no if merge).', () => {
    it('Validation should FAIL', async () => {
        expect(() => validate(gen_flow()))
            .toThrowError(/^ValidationError:.*single conditional block.*has two connections to a fork join block/i)
    });
});
