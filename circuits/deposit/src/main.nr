use std::hash::poseidon2;

fn calculate_leaf(asset_id: Field, asset_amount: Field, owner: Field, secret: Field) -> Field {
    let leaf_hash = poseidon2::Poseidon2::hash([asset_id, asset_amount, owner, secret], 4);

    leaf_hash
}

fn main(
    hash: pub Field,
    asset_id: pub Field,
    asset_amount: pub Field,
    owner: Field,
    secret: Field,
) {
    let reconstructed_leaf = calculate_leaf(asset_id, asset_amount, owner, secret);

    assert(reconstructed_leaf == hash);
}

#[test]
fn test_main() {
    let hash = 9194668555912557146241026266248928483973497222045579120388006164958747201268;
    let asset_id = 1096978651789611665652906124278561787240579697095;
    let amount = 5;
    let owner = 10036677144260647934022413515521823129584317400947571241312859176539726523915;
    let secret = 2389312107716289199307843900794656424062350252250388738019021107824217896920;

    main(hash, asset_id, amount, owner, secret);
}
