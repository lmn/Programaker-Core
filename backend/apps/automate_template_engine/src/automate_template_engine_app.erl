%%%-------------------------------------------------------------------
%% @doc automate_template_engine APP API
%% @end
%%%-------------------------------------------------------------------

-module(automate_template_engine_app).

-behaviour(application).

%% Application callbacks
-export([start/2, stop/1]).

%%====================================================================
%% API
%%====================================================================

start(_StartType, _StartArgs) ->
    automate_template_engine_sup:start_link().

%%--------------------------------------------------------------------
stop(_State) ->
    ok.

%%====================================================================
%% Internal functions
%%====================================================================
