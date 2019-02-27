%%% @doc
%%% REST endpoint to manage bridge.
%%% @end

-module(automate_rest_api_bridge_callback).
-export([init/2]).
-export([ allowed_methods/2
        , options/2
        , is_authorized/2
        , content_types_provided/2
        ]).

-export([ to_json/2
        ]).

-include("./records.hrl").
-include("../../automate_service_port_engine/src/records.hrl").

-record(state, { user_id, bridge_id, callback }).

-spec init(_,_) -> {'cowboy_rest',_,_}.
init(Req, _Opts) ->
    UserId = cowboy_req:binding(user_id, Req),
    BridgeId = cowboy_req:binding(bridge_id, Req),
    Callback = cowboy_req:binding(callback, Req),
    Req1 = automate_rest_api_cors:set_headers(Req),
    {cowboy_rest, Req1
    , #state{ user_id=UserId
            , bridge_id=BridgeId
            , callback=Callback
            }}.

%% CORS
options(Req, State) ->
    {ok, Req, State}.

%% Authentication
-spec allowed_methods(cowboy_req:req(),_) -> {[binary()], cowboy_req:req(),_}.
allowed_methods(Req, State) ->
    io:fwrite("[Bridge callback] Asking for methods~n", []),
    {[<<"GET">>, <<"OPTIONS">>], Req, State}.

is_authorized(Req, State) ->
    Req1 = automate_rest_api_cors:set_headers(Req),
    case cowboy_req:method(Req1) of
        %% Don't do authentication if it's just asking for options
        <<"OPTIONS">> ->
            { true, Req1, State };
        _ ->
            case cowboy_req:header(<<"authorization">>, Req, undefined) of
                undefined ->
                    { {false, <<"Authorization header not found">>} , Req1, State };
                X ->
                    #state{user_id=UserId} = State,
                    case automate_rest_api_backend:is_valid_token_uid(X) of
                        {true, UserId} ->
                            { true, Req1, State };
                        {true, TokenUserId} -> %% Non matching user_id
                            io:fwrite("Url UID: ~p | Token UID: ~p~n", [UserId, TokenUserId]),
                            { { false, <<"Unauthorized to create a program here">>}, Req1, State };
                        false ->
                            { { false, <<"Authorization not correct">>}, Req1, State }
                    end
            end
    end.

%% GET handler
content_types_provided(Req, State) ->
    io:fwrite("Bridge callback: ~p~n", [State]),
    {[{{<<"application">>, <<"json">>, []}, to_json}],
     Req, State}.

to_json(Req, State) ->
    #state{bridge_id=BridgeId, callback=Callback, user_id=UserId} = State,
    case automate_rest_api_backend:callback_bridge(UserId, BridgeId, Callback) of
        {ok, Result} ->
            Output = jiffy:encode(Result),

            Res1 = cowboy_req:delete_resp_header(<<"content-type">>, Req),
            Res2 = cowboy_req:set_resp_header(<<"content-type">>, <<"application/json">>, Res1),

            { Output, Res2, State };
        {error, Reason} ->
            Code = case Reason of
                       not_found -> 404;
                       unauthorized -> 403;
                       _ -> 500
                   end,
            Output = jiffy:encode(#{ <<"success">> => false, <<"message">> => Reason }),
            cowboy_req:reply(Code, #{ <<"content-type">> => <<"application/json">> }, Output, Req)
    end.

