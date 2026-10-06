import type { Point } from '../robots/types';

class Node {
  constructor(
    public parent: Node | null = null,
    public position: Point,
    public g = 0,
    public h = 0,
    public f = 0
  ) {}

  equals(other: Node): boolean {
    return this.position.x === other.position.x && this.position.y === other.position.y;
  }
}

function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export async function astar(
  start: Point,
  end: Point,
  obstacles: Point[],
  gridSize: { width: number; height: number }
): Promise<Point[]> {
  return new Promise(resolve => {
    const startNode = new Node(null, start);
    const endNode = new Node(null, end);

    const openList: Node[] = [startNode];
    const closedList: Node[] = [];
    
    const obstacleSet = new Set(obstacles.map(p => `${p.x},${p.y}`));

    const findPath = () => {
        if (openList.length === 0) {
            resolve([]); // No path found
            return;
        }

        let currentNode = openList[0];
        let currentIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < currentNode.f) {
                currentNode = openList[i];
                currentIndex = i;
            }
        }

        openList.splice(currentIndex, 1);
        closedList.push(currentNode);
        
        if (currentNode.equals(endNode)) {
            const path: Point[] = [];
            let current: Node | null = currentNode;
            while (current) {
                path.push(current.position);
                current = current.parent;
            }
            resolve(path.reverse());
            return;
        }
        
        const children: Node[] = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // 4 directions

        for (const dir of directions) {
            const nodePosition: Point = {
                x: currentNode.position.x + dir[0],
                y: currentNode.position.y + dir[1],
            };

            if (
                nodePosition.x < 0 || nodePosition.x >= gridSize.width ||
                nodePosition.y < 0 || nodePosition.y >= gridSize.height ||
                obstacleSet.has(`${nodePosition.x},${nodePosition.y}`)
            ) {
                continue;
            }

            const newNode = new Node(currentNode, nodePosition);
            children.push(newNode);
        }

        for (const child of children) {
            if (closedList.some(closedChild => closedChild.equals(child))) {
                continue;
            }
            
            child.g = currentNode.g + 1;
            child.h = heuristic(child.position, endNode.position);
            child.f = child.g + child.h;

            if (openList.some(openNode => child.equals(openNode) && child.g > openNode.g)) {
                continue;
            }

            openList.push(child);
        }
        
        // Use setTimeout to allow UI to update and not block the main thread
        setTimeout(findPath, 0);
    };

    findPath();
  });
}
