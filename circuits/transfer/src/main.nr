global HEIGHT: u32 = 12;

use std::hash::poseidon2;

struct InputNote {
    asset_id: Field,
    asset_amount: Field,
    owner: Field,
    owner_secret: Field,
    secret: Field,
    nullifier: Field,
    leaf_index: Field,
    path: [Field; HEIGHT],
    path_indices: [Field; HEIGHT],
}

fn compute_merkle_root(leaf: Field, path: [Field; HEIGHT - 1], path_indices: [Field; HEIGHT - 1]) -> Field {
    let mut current = leaf;
    for i in 0..HEIGHT - 1 {
        let path_bit = path_indices[i];
        let (hash_left, hash_right) = if path_bit == 0 {
            (path[i], current)
        } else {
            (current, path[i])
        };
        current = poseidon2::Poseidon2::hash([hash_left, hash_right], 2);
    }
    current
}

fn main(x: Field, y: pub Field) {
    assert(x != y);
}

#[test]
fn test_main() {
    main(1, 2);

    // this is the empty tree after the hash 9194668555912557146241026266248928483973497222045579120388006164958747201268
    // is inserted at index 0

    let leaf = 9194668555912557146241026266248928483973497222045579120388006164958747201268;
    let path_indices = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    let path = [
        13640659629327953230197633652529006805891215582818597888084863207147219313784,
        19984673905358619496530873554532699316557532969285237470013525856790495658245,
        16054022188397161938956278061878851932956033792728066452148841350372709856325,
        5088416905632566847489144423785449560596474956704206833561295200206123281740,
        7133742548945823648162717112853949322814446130740022056636610844051076979955,
        15996976533936258369996214630141201173712053425083354410411158951568838211277,
        12856765864455281126306545538308148448222111081433610923407492298111988109924,
        4407863489559565071205165471845081321675763465852502126771740970311657294198,
        20448284296610764092326252358036828964180135505542140040145855516028834425624,
        7022843789375185322738689530892530453984779704784378294646894048972162829679,
        10906054357754859492130109809751867122631984061959461434096281674698176679467
    ];


    let recon_merkle_root = compute_merkle_root(leaf, path, path_indices);
    println(recon_merkle_root);

    // Uncomment to make test fail
    // main(1, 1);
}
