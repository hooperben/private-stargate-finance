use std::hash::poseidon2;

fn main(x: Field, y: pub Field) {
    assert(x != y);

    let tester = poseidon2::Poseidon2::hash([x, y], 2);

    println(tester);
}

#[test]
fn test_main() {
    main(1, 2);

    // Uncomment to make test fail
    // main(1, 1);
}
