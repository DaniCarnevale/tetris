import './style.css'

// 1 . Inicializar el canvas
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d'); 
const $score = document.querySelector('span');

const BLOCK_SIZE = 20;
const BOARD_WIDTH = 14;
const BOARD_HEIGHT = 30;

let score = 0;

canvas.width = BLOCK_SIZE * BOARD_WIDTH;
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;

context.scale(BLOCK_SIZE, BLOCK_SIZE); 

// 3 . Board
const  board = [
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 0],
  [1 , 1 , 1 , 1 , 1 , 1 , 1 , 1 , 0 , 0 , 1 , 1 , 1 , 1],
]

// 4 . Piece
const piece = {
  position: { x: 5, y: 5},
  shape: [
    [ 1 , 1 ],
    [ 1 , 1 ]
  ]
}

// Random Pieces

const PIECES = [
  [
    [1 , 1 ],
    [1 , 1 ]
  ],
  [
    [ 1 , 1 , 1 , 1]
  ],
  [
    [ 0 , 1 , 0 ],
    [ 1 , 1 , 1 ] 
  ],
  [
    [ 1 , 1 , 0 ],
    [ 0 , 1 , 1 ]
  ],
  [
    [ 0 , 1 , 1 ],
    [ 1 , 1 , 0 ]
  ],
  [
    [ 1 , 1 ],
    [ 0 , 1 ],
    [ 0 , 1 ]
  ],
  [
    [ 1 , 1 ],
    [ 1 , 0 ],
    [ 1 , 0 ]
  ]
]

let dropCounter = 0;
let lastTime = 0;

function update(time = 0){
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > 500){
    piece.position.y++;
    dropCounter = 0;

    if(checkColission()){
      piece.position.y--;
      solidifyPiece();
      removeRows();
    }
  }

  draw(); 
  window.requestAnimationFrame(update);
   
}

function draw(){
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height );

  board.forEach(( row , y ) => {
    row.forEach(( value , x) => {
      if (value === 1){
        context.fillStyle = 'grey';
        context.fillRect(x , y , 1 , 1);
      }
    })
  })

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if(value){
        context.fillStyle = 'pink';
        context.fillRect(x + piece.position.x, y + piece.position.y, 1, 1);
      }
    })
  })
  $score.innerText = score;
}

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    piece.position.x--;
    if(checkColission()){
      piece.position.x++;
    }
  }
  if (event.key === 'ArrowRight') {
    piece.position.x++;
    if(checkColission()){
      piece.position.x--;
    }
  }
  if (event.key === 'ArrowDown') {
    piece.position.y++;
    if(checkColission()){
      piece.position.y--;
      solidifyPiece();
      removeRows();
    }
  }
  if (event.key === 'ArrowUp'){
    const rotated = [];

    for (let i = 0; i < piece.shape[0].length; i++){
      const row = [];

      for( let j = piece.shape.length - 1; j >= 0 ; j--){
        row.push(piece.shape[j][i]); 
      }

      rotated.push(row);
    }
    const previousShape = piece.shape;
    piece.shape = rotated;
    if (checkColission()){
      piece.shape = previousShape;
    }
  }
})

function checkColission(){
  for(let y = 0; y < piece.shape.length; y++) {
    for(let x = 0; x < piece.shape[y].length; x++) {
      if (
        piece.shape[y][x] !== 0 &&
        (board[y + piece.position.y] && board[y + piece.position.y][x + piece.position.x]) !== 0
      ) {
        return true; // Hay una colisión
      }
    }
  }
  return false; // No hay colisión
}

function solidifyPiece(){
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if(value === 1){
        board[y + piece.position.y][x + piece.position.x] = 1;
      }
    })
  })
  //reset piece
  piece.position.x = Math.floor(BOARD_WIDTH / 2 - 2);
  piece.position.y = 0;
  //get random piece
  piece.shape = PIECES[Math.floor(Math.random() * PIECES.length) ]

  if(checkColission()){
    window.alert("Game Over!");
    board.forEach((row) => row.fill(0));
  }
}

function removeRows(){
  const rowsToRemove = [];

  board.forEach((row, y) => {
    if (row.every(value => value === 1)){
      rowsToRemove.push(y)
    }
  })

  rowsToRemove.forEach(y => {
    board.splice(y, 1);
    const newRow = Array(BOARD_WIDTH).fill(0);
    board.unshift(newRow);
    score +=10;
    console.log(score);
  })
}

update();

