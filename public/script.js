const socket = io();

const app = document.getElementById('app');
const countContainer = document.getElementById('checked-count');
const loadingContainer = document.getElementById('loader');
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
let totalChecked = 0;

let stateInitialized = new Promise((resolve) => {
  outerContainer.style.display = 'none';
  socket.on('initialState', (initialState) => {
    console.log('initialState', initialState);
    checkedBoxes = new Set(initialState.checked);
    initialState.unchecked.forEach((index) => checkedBoxes.delete(index));
    console.log('initialState.checked', initialState.totalChecked);
    updateCheckedCount(initialState.totalChecked);
    resolve();
  });
});

socket.on('checkboxUpdate', (data) => {
  if (data.checked) {
    checkedBoxes.add(data.index);
  } else {
    checkedBoxes.delete(data.index);
  }
  updateCheckedCount(data.totalChecked);
  requestAnimationFrame(() => updateCheckbox(data.index));
});

socket.on('rangeUpdate', (states) => {
  states.checked.forEach((index) => checkedBoxes.add(index));
  states.unchecked.forEach((index) => checkedBoxes.delete(index));
  updateCheckedCount(states.totalChecked);
  updateCheckboxesInView();
});

socket.on('error', (error) => {
  alert(error);
});

function updateCheckedCount(count) {
  totalChecked = count;
  countContainer.textContent = `Checked boxes: ${totalChecked}`;
}

function updateCheckboxesInView() {
  visibleCheckboxes.forEach((index) => {
    requestAnimationFrame(() => updateCheckbox(index));
  });
}

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

  const startIndex = startRow * columns;
  const endIndex = Math.min(
    totalCheckboxes - 1,
    endRow * columns + columns - 1
  );

  socket.emit('requestRange', { start: startIndex, end: endIndex });

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
  await stateInitialized.then(() => {
    outerContainer.style.display = 'block';
    loadingContainer.style.display = 'none';
  });
  updateVisibleCheckboxes();
}

init();
scrollContainer.addEventListener('scroll', updateVisibleCheckboxes);
window.addEventListener('resize', () => {
  calculateDimensions();
  repositionAllCheckboxes();
  updateVisibleCheckboxes();
});

const resizeObserver = new ResizeObserver(() => {
  calculateDimensions();
  repositionAllCheckboxes();
  updateVisibleCheckboxes();
});
resizeObserver.observe(app);
