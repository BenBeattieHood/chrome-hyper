import { UniqueIdentifier } from "@dnd-kit/core";

export interface HierarchialNode<Value> {
    isExpanded: boolean;
    value: Value;
    children: Record<UniqueIdentifier, HierarchialNode<Value>> | undefined;
}
export interface FlattenedHierarchialNode<Value>
    extends Omit<HierarchialNode<Value>, 'children'> {
    id: UniqueIdentifier;
    depth: number;
    allowsChildren: boolean;
    hiddenChildren:
    | Record<UniqueIdentifier, HierarchialNode<Value>>
    | undefined;
    parentId: UniqueIdentifier | null;
}
