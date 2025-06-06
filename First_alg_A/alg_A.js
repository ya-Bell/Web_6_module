let map = [], start = null, end = null;
let isDrawingWalls = false;
const startButton = document.getElementById('start-pathfinding');
const mazeButton = document.getElementById('generate-maze');
const clearButton = document.getElementById('clear-map');
const generateButton = document.getElementById('generate-map');

document.getElementById('generate-map').addEventListener('click', generateMap);
document.getElementById('generate-maze').addEventListener('click', generateMaze);
document.getElementById('start-pathfinding').addEventListener('click', startPathfinding);
document.getElementById('clear-map').addEventListener('click', clearMap);
document.getElementById('toggle-instruction').addEventListener('click', toggleInstruction);

// размер карта, мин 2 макс 50 
document.getElementById('size').addEventListener('input', function () {
    let value = parseInt(this.value);
    if (isNaN(value) || value < 2) this.value = 2;
    if (value > 50) this.value = 50;
});

//генерация карты 
function generateMap() {
    const size = +document.getElementById('size').value;

    // cброс данных
    map = [];
    start = null;
    end = null;
    isDrawingWalls = false;

    const container = document.getElementById('map');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 40px)`;//размер
    container.style.gridTemplateRows = `repeat(${size}, 40px)`;

    for (let row = 0; row < size; row++) {
        const rowArray = [];
        for (let col = 0; col < size; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener('mousedown', () => handleCellClick(cell, row, col));
            cell.addEventListener('mouseover', () => {
                const mode = document.getElementById('mode-select').value;
                if (isDrawingWalls) {
                    if (mode === 'wall' || (mode === 'auto' && start && end)) {
                        if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                            cell.classList.add('wall');
                        }
                    }
                }
            });
            

            rowArray.push(cell);
            container.appendChild(cell);
        }
        map.push(rowArray);
    }

    document.addEventListener('mousedown', () => isDrawingWalls = true);//начало рисования
    document.addEventListener('mouseup', () => isDrawingWalls = false);//конец рисования
}

//нажатия(клики)
function handleCellClick(cell, row, col) {
    const mode = document.getElementById('mode-select').value;

    if (mode === 'start') {
        if (start) map[start.row][start.col].classList.remove('start');
        start = { row, col };
        cell.classList.add('start');
    } else if (mode === 'end') {
        if (end) map[end.row][end.col].classList.remove('end');
        end = { row, col };
        cell.classList.add('end');
    } else if (mode === 'wall') {
        if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
            cell.classList.toggle('wall');
        }
    } else if (mode === 'auto') {
        if (cell.classList.contains('start')) {
            start = null;
            cell.classList.remove('start');
        } else if (cell.classList.contains('end')) {
            end = null;
            cell.classList.remove('end');
        } else if (!start) {
            start = { row, col };
            cell.classList.add('start');
        } else if (!end) {
            end = { row, col };
            cell.classList.add('end');
        } else {
            cell.classList.toggle('wall');
        }
    }
}

//запуск поиска
function startPathfinding() {
    if (!start || !end) {
        alert("Не установлены начальная и конечная точки!");
        return;
    }

    const hasPathOrVisited = map.some(row =>
        row.some(cell => cell.classList.contains('path') || cell.classList.contains('visited'))
    );

    if (hasPathOrVisited) {
        alert("Сначала очистите карту перед запуском алгоритма!");
        return;
    }

    const { visitedOrder, cameFrom } = aStar(map, start, end);
    toggleUIBlocking(true);//блок кнопки

    const endKey = `${end.row},${end.col}`;
    if (!cameFrom[endKey]) {
        alert("Путь не найден!");
        toggleUIBlocking(false);//анблок кнопки
        return;
    }

    animateExploration(visitedOrder, () => {
        const path = reconstructPath(cameFrom, end);
        animatePath(path);
    });
}

function aStar(map, start, end) {
    const openSet = [start];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    const visitedOrder = [];

    const key = (cell) => `${cell.row},${cell.col}`;
    const heuristic = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

    gScore[key(start)] = 0;
    fScore[key(start)] = heuristic(start, end);

    while (openSet.length > 0) {
        openSet.sort((a, b) => fScore[key(a)] - fScore[key(b)]);
        const current = openSet.shift();

        visitedOrder.push(current);

        if (current.row === end.row && current.col === end.col) {
            break;
        }

        for (let neighbor of getNeighbors(current, map)) {
            const nKey = key(neighbor);
            const tentativeG = gScore[key(current)] + 1;

            if (tentativeG < (gScore[nKey] ?? Infinity)) {
                cameFrom[nKey] = current;
                gScore[nKey] = tentativeG;
                fScore[nKey] = tentativeG + heuristic(neighbor, end);

                if (!openSet.find(c => key(c) === nKey)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return { visitedOrder, cameFrom };
}

function getNeighbors(cell, map) {
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    
    const neighbors = [];

    for (let [dx, dy] of directions) {
        const newRow = cell.row + dx;
        const newCol = cell.col + dy;

        if (//проверка границы
            newRow >= 0 && newRow < map.length &&
            newCol >= 0 && newCol < map[0].length &&
            !map[newRow][newCol].classList.contains('wall')//не стена
        ) {
            neighbors.push({ row: newRow, col: newCol });
        }
    }

    return neighbors;
}

//восстановление пути
function reconstructPath(cameFrom, end) {
    const path = [];
    let current = end;
    while (cameFrom[`${current.row},${current.col}`]) {
        path.push([current.row, current.col]);
        current = cameFrom[`${current.row},${current.col}`];
    }
    path.push([current.row, current.col]);
    return path.reverse();
}

function animateExploration(visitedOrder, onComplete) {
    visitedOrder.forEach((cell, index) => {
        setTimeout(() => {
            const element = map[cell.row][cell.col];
            if (!element.classList.contains('start') && !element.classList.contains('end')) {
                element.classList.add('visited');
            }
            if (index === visitedOrder.length - 1) {
                setTimeout(onComplete, 200);//запуск 
            }
        }, index * 30);
    });
}

function animatePath(path) {
    path.forEach(([row, col], index) => {
        setTimeout(() => {
            const cell = map[row][col];
            if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                cell.classList.add('path');
            }
            if (index === path.length - 1) {
                toggleUIBlocking(false);
            }
        }, index * 50);
    });
}

function generateMaze() {
    if (!start || !end) {
        alert("Сначала установите начальную и конечную точки!");
        return;
    }

    const hasPathOrVisited = map.some(row =>
        row.some(cell => cell.classList.contains('path') || cell.classList.contains('visited'))
    );

    if (hasPathOrVisited) {
        alert("Сначала очистите карту перед генерацией лабиринта!");
        return;
    }
    
    map.forEach(row => row.forEach(cell => {
        if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
            cell.classList.toggle('wall', Math.random() > 0.7); //расстановка рандомных стен
        }
    }));
}

function clearMap() {
    document.getElementById('map').innerHTML = '';
    start = null;
    end = null;
    map = [];
}

function toggleInstruction() {
    const instructionBox = document.getElementById('instruction-box');
    instructionBox.style.display = instructionBox.style.display === 'none' || instructionBox.style.display === '' ? 'block' : 'none';// показываем / скрываем
}

// блокировка интерфейса во время работы
function toggleUIBlocking(state) {
    startButton.disabled = state;
    mazeButton.disabled = state;
    clearButton.disabled = state;
    generateButton.disabled = state;
  }