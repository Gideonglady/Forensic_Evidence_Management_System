import hashlib
from typing import List, Tuple, Optional

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def build_merkle_tree(leaves: List[str]) -> List[List[str]]:
    """
    Build the Merkle tree and return all levels (bottom-up).
    Each leaf should be a hex string (already hashed).
    """
    if not leaves:
        return []
    tree = [leaves]
    while len(tree[-1]) > 1:
        level = []
        nodes = tree[-1]
        for i in range(0, len(nodes), 2):
            left = nodes[i]
            right = nodes[i+1] if i+1 < len(nodes) else nodes[i]
            combined = bytes.fromhex(left) + bytes.fromhex(right)
            level.append(sha256(combined))
        tree.append(level)
    return tree

def get_merkle_root(leaves: List[str]) -> Optional[str]:
    tree = build_merkle_tree(leaves)
    if not tree:
        return None
    return tree[-1][0]

def get_merkle_proof(leaves: List[str], index: int) -> List[Tuple[str, str]]:
    """
    Returns a list of (sibling_hash, direction) where direction is 'left' or 'right'.
    """
    tree = build_merkle_tree(leaves)
    proof = []
    for level in tree[:-1]:
        sibling_index = index ^ 1
        if sibling_index < len(level):
            sibling_hash = level[sibling_index]
            direction = 'left' if sibling_index < index else 'right'
            proof.append((sibling_hash, direction))
        index //= 2
    return proof

def verify_merkle_proof(leaf: str, proof: List[Tuple[str, str]], root: str) -> bool:
    computed_hash = leaf
    for sibling_hash, direction in proof:
        if direction == 'left':
            combined = bytes.fromhex(sibling_hash) + bytes.fromhex(computed_hash)
        else:
            combined = bytes.fromhex(computed_hash) + bytes.fromhex(sibling_hash)
        computed_hash = sha256(combined)
    return computed_hash == root 