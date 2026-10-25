export const PLAN_CODE=`from itertools import accumulate

def plan(batches, p):
    assert p > 0 and batches and all(b > 0 for b in batches)
    offsets = [0, *accumulate(batches)]
    B = offsets[-1]
    q, u = divmod(B, p)
    requests = list(zip(offsets[:-1], offsets[1:]))
    workers = [(k*q + min(k, u),
                k*q + min(k, u) + q + (k < u)) for k in range(p)]
    assert sum(end-start for start, end in workers) == B
    return requests, workers

requests, workers = plan([1, 2, 4], 2)
assert requests == [(0, 1), (1, 3), (3, 7)]
assert workers == [(0, 4), (4, 7)]

# 用样本编号充当输出，只验证切片与还原，不冒充模型分数。
Y = list(range(7))
restored = [Y[start:end] for start, end in requests]
assert restored == [[0], [1, 2], [3, 4, 5, 6]]
print("request slices:", requests)
print("worker slices: ", workers)
print("responses:     ", restored)
`;
export const CLIENT_CODE='httpclient.InferInput("data", model_input.shape,\n                     np_to_triton_dtype(model_input.dtype))\ninputs[0].set_data_from_numpy(model_input)\nhttpclient.InferRequestedOutput("resnetv24_dense0_fwd")\nresponse = client.infer("resnet", inputs, request_id="1", outputs=outputs)\nresponse.as_numpy("resnetv24_dense0_fwd")';
