const socket = io();

const outerContainer = document.getElementById('outer-container');
const scrollContainer = document.getElementById('scroll-container');
const content = document.getElementById('content');
const checkboxSize = 50; // 40px + 5px margin on each side
const totalCheckboxes = 1000000; // 1 million
const nodePoolSize = 1000; // Adjust based on performance
let nodePool = [];
let visibleCheckboxes = new Set();
let columns, rows;

let checkedBoxes = new Set();

let stateInitialized = new Promise((resolve) => {
  socket.on('initialState', (initialCheckedBoxes) => {
    console.log('initialState', initialCheckedBoxes);
    checkedBoxes = new Set(initialCheckedBoxes);
    resolve();
  });
});

socket.on('checkboxUpdate', (data) => {
  if (data.checked) {
    checkedBoxes.add(data.index);
  } else {
    checkedBoxes.delete(data.index);
  }
  requestAnimationFrame(() => updateCheckbox(data.index));
});

function calculateScrollbarWidth() {
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  outer.appendChild(inner);

  scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  document.body.removeChild(outer);
}

function calculateDimensions() {
  const maxWidth = window.innerWidth - 20 - scrollbarWidth; // 10px margin on each side, minus scrollbar
  columns = Math.floor(maxWidth / checkboxSize);
  rows = Math.ceil(totalCheckboxes / columns);

  const contentWidth = columns * checkboxSize;
  outerContainer.style.width = `${contentWidth + scrollbarWidth}px`;
  outerContainer.style.height = `${Math.min(
    window.innerHeight - 20,
    rows * checkboxSize
  )}px`;
  scrollContainer.style.height = `${Math.min(
    window.innerHeight - 20,
    rows * checkboxSize
  )}px`;
  content.style.height = `${rows * checkboxSize}px`;
  content.style.width = `${contentWidth}px`;
  content.style.marginLeft = `${scrollbarWidth / 2}px`; // Center the content
}

function createNodePool() {
  for (let i = 0; i < nodePoolSize; i++) {
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.width = '100%';
    checkbox.style.height = '100%';
    checkbox.style.margin = 0;
    checkbox.addEventListener('change', handleCheckboxChange);
    checkboxContainer.appendChild(checkbox);
    nodePool.push(checkboxContainer);
  }
}

function handleCheckboxChange(e) {
  const index = parseInt(e.target.parentElement.dataset.index);
  const checked = e.target.checked;
  if (checked) {
    checkedBoxes.add(index);
  } else {
    checkedBoxes.delete(index);
  }
  socket.emit('checkboxChange', { index, checked });
}

function updateCheckbox(index) {
  const checkbox = document.querySelector(`[data-index="${index}"] input`);
  if (checkbox) {
    const isChecked = checkedBoxes.has(index);
    if (checkbox.checked !== isChecked) {
      checkbox.checked = isChecked;
    }
  }
}

function updateVisibleCheckboxes() {
  const scrollTop = scrollContainer.scrollTop;
  const viewportHeight = scrollContainer.clientHeight;

  const startRow = Math.floor(scrollTop / checkboxSize);
  const endRow = Math.min(
    rows - 1,
    Math.floor((scrollTop + viewportHeight) / checkboxSize)
  );

  const visibleIndexes = new Set();
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < totalCheckboxes) {
        visibleIndexes.add(index);
      }
    }
  }

  // Remove no longer visible checkboxes
  for (let index of visibleCheckboxes) {
    if (!visibleIndexes.has(index)) {
      const checkbox = document.querySelector(`[data-index="${index}"]`);
      if (checkbox) {
        content.removeChild(checkbox);
        nodePool.push(checkbox);
      }
      visibleCheckboxes.delete(index);
    }
  }

  // Add newly visible checkboxes
  for (let index of visibleIndexes) {
    if (!visibleCheckboxes.has(index)) {
      if (nodePool.length === 0) createNodePool();
      const checkbox = nodePool.pop();
      positionCheckbox(checkbox, index);
      content.appendChild(checkbox);
      visibleCheckboxes.add(index);
      requestAnimationFrame(() => updateCheckbox(index));
    }
  }
}

function positionCheckbox(checkbox, index) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  checkbox.style.top = `${row * checkboxSize}px`;
  checkbox.style.left = `${col * checkboxSize}px`;
  checkbox.dataset.index = index;
  const input = checkbox.getElementsByTagName('input')[0];
  input.id = `checkbox-${index}`;
  input.checked = checkedBoxes.has(index);
}

function repositionAllCheckboxes() {
  visibleCheckboxes.forEach((index) => {
    const checkbox = document.querySelector(`[data-index="${index}"]`);
    if (checkbox) {
      positionCheckbox(checkbox, index);
    }
  });
}

async function init() {
  calculateScrollbarWidth();
  calculateDimensions();
  createNodePool();
  await stateInitialized;
  updateVisibleCheckboxes();
}

init();
scrollContainer.addEventListener('scroll', updateVisibleCheckboxes);
window.addEventListener('resize', () => {
  calculateDimensions();
  repositionAllCheckboxes();
  updateVisibleCheckboxes();
});
