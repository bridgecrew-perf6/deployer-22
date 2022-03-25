pragma solidity ^0.8.0;

contract CodeLab {
    function testBlockHashes()
    public
    view
    returns(bytes32[] memory blockHashes) {
        blockHashes = new bytes32[](1000);
        uint256 current = block.number;
        for (uint i = 0; i < 1000 ; i++) {
            blockHashes[i] = blockhash(current - i - 1);
        }
        return blockHashes;
    }
}
