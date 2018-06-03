%%% @doc
%%% REST endpoint to manage knowledge collections.
%%% @end

-module(automate_rest_api_sessions_login).
-export([init/2]).
-export([ allowed_methods/2
        , content_types_accepted/2
        , options/2
        ]).

-export([accept_json_modify_collection/2]).
-include("./records.hrl").

-record(login_seq, { rest_session,
                     login_data
                   }).

-spec init(_,_) -> {'cowboy_rest',_,_}.
init(Req, _Opts) ->
    {cowboy_rest, Req
    , #login_seq{ rest_session=undefined
                , login_data=undefined}}.

%% -spec is_authorized(cowboy_req:req(),_) -> {'true' | {'false', binary()}, cowboy_req:req(),_}.
%% is_authorized(Req, State) ->
%%     rest_is_authorized:is_authorized(Req, State).

%% CORS
options(Req, State) ->
    Req1 = cowboy_req:set_resp_header(<<"access-control-allow-methods">>, <<"GET, POST, OPTIONS">>, Req),
    Req2 = cowboy_req:set_resp_header(<<"access-control-allow-origin">>, <<"*">>, Req1),
    Req3 = cowboy_req:set_resp_header(<<"Access-Control-Max-Age">>, <<"3600">>, Req2),
    Req4 = cowboy_req:set_resp_header(<<"Access-Control-Allow-Headers">>,
                                      <<"authorization, content-type, xsrf-token">>, Req3),
    Req5 = cowboy_req:set_resp_header(<<"Access-Control-Expose-Headers">>,
                                      <<"xsrf-token">>, Req4),
    {ok, Req5, State}.

-spec allowed_methods(cowboy_req:req(),_) -> {[binary()], cowboy_req:req(),_}.
allowed_methods(Req, State) ->
    io:fwrite("Asking for methods~n", []),
    {[<<"POST">>, <<"GET">>, <<"OPTIONS">>], Req, State}.

content_types_accepted(Req, State) ->
    io:fwrite("Control types accepted~n", []),
	{[{{<<"application">>, <<"json">>, []}, accept_json_modify_collection}],
   Req, State}.

%%%% POST
%
-spec accept_json_modify_collection(cowboy_req:req(),#login_seq{})
      -> {'true',cowboy_req:req(),_}.
accept_json_modify_collection(Req, Session) ->
    case cowboy_req:has_body(Req) of
        true ->
            {ok, Body, Req2} = read_body(Req),
            Parsed = [jiffy:decode(Body, [return_maps])],
            case to_register_data(Parsed) of
                { ok, LoginData } ->
                    case automate_rest_api_backend:login_user(LoginData) of
                        { ok, Token } ->
                            Output = jiffy:encode(#{ <<"token">> => Token }),
                            Res1 = cowboy_req:set_resp_body(Output, Req2),
                            Res2 = cowboy_req:delete_resp_header(<<"content-type">>, Res1),
                            Res3 = cowboy_req:set_resp_header(<<"content-type">>, <<"application/json">>, Res2),
                            { true, Res3, Session#login_seq{
                                            login_data=LoginData} };

                        {error, Reason} ->
                            io:format("Error registering: ~p~n", [Reason]),
                            { false, Req2, Session}
                    end;
                { error, _Reason } ->
                    { false, Req2, Session }
            end;
        false ->
            {false, Req, Session }
    end.

to_register_data([#{ <<"password">> := Password
                   , <<"username">> := Username
                   }]) ->
    { ok, #login_rec{ password=Password
                    , username=Username
                    } };

to_register_data(_X) ->
    { error, "Data structures not matching" }.

read_body(Req0) ->
    read_body(Req0, <<>>).

read_body(Req0, Acc) ->
    case cowboy_req:read_body(Req0) of
        {ok, Data, Req} -> {ok, << Acc/binary, Data/binary >>, Req};
        {more, Data, Req} -> read_body(Req, << Acc/binary, Data/binary >>)
    end.
