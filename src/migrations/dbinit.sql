CREATE TABLE IF NOT EXISTS op_return
(
    op_return text NOT NULL,
    tx_hash text NOT NULL,
    block_number integer NOT NULL,
    block_hash text NOT NULL,
    UNIQUE(op_return,tx_hash)
);
CREATE TABLE IF NOT EXISTS btc_index
(
    height integer NOT NULL,
    updated_at timestamp NOT NULL,
    errored integer NOT NULL,
    CONSTRAINT btc_index_pkey PRIMARY KEY (height)
);