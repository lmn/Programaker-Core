%%%% Instruction map entry names
-define(TYPE, <<"type">>).
-define(ARGUMENTS, <<"args">>).
-define(CONTENTS, <<"contents">>).
-define(BLOCK_ID, <<"id">>).
-define(VALUE, <<"value">>).
-define(TEMPLATE_NAME_TYPE, <<"constant">>).

%%%% Command types
%%%%  Operations
%% Call service
-define(COMMAND_CALL_SERVICE, <<"command_call_service">>).
-define(CONTEXT_SELECT_CONNECTION, <<"operator_select_connection">>).

%% General control
-define(COMMAND_WAIT, <<"control_wait">>).
-define(COMMAND_REPEAT, <<"control_repeat">>).
-define(COMMAND_REPEAT_UNTIL, <<"control_repeat_until">>).
-define(COMMAND_WAIT_UNTIL, <<"control_wait_until">>).
-define(COMMAND_IF, <<"control_if">>).
-define(COMMAND_IF_ELSE, <<"control_if_else">>).

%% String operations
-define(COMMAND_JOIN, <<"operator_join">>).
-define(COMMAND_JSON, <<"operator_json_parser">>).

%% Templates
-define(MATCH_TEMPLATE_STATEMENT, <<"automate_match_template_stmt">>).
-define(MATCH_TEMPLATE_CHECK, <<"automate_match_template_check">>).

%% Any() operations
-define(COMMAND_EQUALS, <<"operator_equals">>).
-define(COMMAND_LESS_THAN, <<"operator_lt">>).
-define(COMMAND_GREATER_THAN, <<"operator_gt">>).

%% Boolean operations
-define(COMMAND_AND, <<"operator_and">>).
-define(COMMAND_OR, <<"operator_or">>).
-define(COMMAND_NOT, <<"operator_not">>).

%% Numeric operations
-define(COMMAND_ADD, <<"operator_add">>).
-define(COMMAND_SUBTRACT, <<"operator_subtract">>).
-define(COMMAND_MULTIPLY, <<"operator_multiply">>).
-define(COMMAND_DIVIDE, <<"operator_divide">>).

%% Variable control
-define(COMMAND_SET_VARIABLE, <<"data_setvariableto">>).
-define(COMMAND_CHANGE_VARIABLE, <<"data_changevariableby">>).
-define(COMMAND_DATA_VARIABLE, <<"data_variable">>).

%% List control
-define(COMMAND_ADD_TO_LIST, <<"data_addtolist">>).
-define(COMMAND_DELETE_OF_LIST, <<"data_deleteoflist">>).
-define(COMMAND_INSERT_AT_LIST, <<"data_insertatlist">>).
-define(COMMAND_REPLACE_VALUE_AT_INDEX, <<"data_replaceitemoflist">>).
-define(COMMAND_ITEM_OF_LIST, <<"data_itemoflist">>).
-define(COMMAND_ITEMNUM_OF_LIST, <<"data_itemnumoflist">>).
-define(COMMAND_LENGTH_OF_LIST, <<"data_lengthoflist">>).
-define(COMMAND_LIST_CONTAINS_ITEM, <<"data_listcontainsitem">>).
-define(COMMAND_LIST_GET_CONTENTS, <<"data_listcontents">>).

%%%% Variables
-define(VARIABLE_BLOCK, <<"block">>).
-define(VARIABLE_CONSTANT, <<"constant">>).
-define(VARIABLE_VARIABLE, <<"variable">>).
-define(VARIABLE_LIST, <<"list">>).

%%%% Signal types
-define(SIGNAL_PROGRAM_TICK, tick).

%% Custom signals
-define(SIGNAL_PROGRAM_CUSTOM, <<"automate_on_custom_signal">>). % Listener
-define(COMMAND_CUSTOM_SIGNAL, <<"automate_trigger_custom_signal">>). % Caller

%%%% Operation parameters
-define(MILLIS_PER_TICK, 100).

%%%% Monitors
%% Values
-define(WAIT_FOR_MONITOR, <<"wait_for_monitor">>).
-define(WAIT_FOR_MONITOR_COMMAND, ?WAIT_FOR_MONITOR).
-define(TRIGGERED_BY_MONITOR, triggered_by_monitor).
-define(MONITOR_ANY_VALUE, <<"any_value">>).

%% Fields
-define(MONITOR_ID, <<"monitor_id">>).
-define(MONITOR_EXPECTED_VALUE, <<"monitor_expected_value">>).
-define(MONITOR_SAVE_VALUE_TO, <<"monitor_save_value_to">>).

%%%% Services
-define(SERVICE_ID, <<"service_id">>).
-define(SERVICE_CALL_VALUES, <<"service_call_values">>).
-define(SERVICE_ACTION, <<"service_action">>).

-define(LAST_MONITOR_VALUES, <<"__last_monitor_values__">>).
