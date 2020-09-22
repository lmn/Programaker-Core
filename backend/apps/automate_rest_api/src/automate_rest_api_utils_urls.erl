-module(automate_rest_api_utils_urls).
-export([ service_id_url/1
        , bridge_control_url/1
        ]).

-spec service_id_url(binary()) -> binary().
service_id_url(ServiceId) ->
    binary:list_to_bin(lists:flatten(io_lib:format("/api/v0/services/by-id/~s", [ServiceId]))).


bridge_control_url(BridgeId) ->
    binary:list_to_bin(lists:flatten(io_lib:format("/api/v0/bridges/by-id/~s/communication", [BridgeId]))).
