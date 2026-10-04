const svg = document.getElementById("drawing-area");
const gridBackground = document.getElementById("grid-background");

const GRID_SIZE = 20;
const RESISTOR_HALF_LENGTH = 40;

const selectButton = document.getElementById("select-tool");
const nodeButton = document.getElementById("node-tool");
const resistorButton = document.getElementById("resistor-tool");
const wireButton = document.getElementById("wire-tool");

const noSelection = document.getElementById("no-selection");
const nodeProperties = document.getElementById("node-properties");
const resistorProperties = document.getElementById("resistor-properties");
const wireProperties = document.getElementById("wire-properties");
const wirePointProperties = document.getElementById("wire-point-properties");

const nodeNameInput = document.getElementById("node-name-input");
const resistorNameInput = document.getElementById("resistor-name-input");
const resistorValueInput = document.getElementById("resistor-value-input");

const deleteNodeButton = document.getElementById("delete-node-button");
const rotateResistorButton = document.getElementById("rotate-resistor-button");
const deleteResistorButton = document.getElementById("delete-resistor-button");
const deleteWireButton = document.getElementById("delete-wire-button");
const deleteWirePointButton = document.getElementById("delete-wire-point-button");

// ==============================
// ADATOK
// ==============================

const nodes = [];
const resistors = [];
const wires = [];

let nodeCounter = 0;
let resistorCounter = 1;
let wireCounter = 1;

let currentTool = "select";
let wireStartConnector = null;
let selectedElement = null;

let draggedWireEndpoint = null;
let draggedWireEndpointPosition = null;
let originalWireEndpointConnector = null;

// ==============================
// SVG SEGÉDFÜGGVÉNY
// ==============================

function createSVGElement(type, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", type);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }

  return element;
}

// ==============================
// ESZKÖZTÁR
// ==============================

function setTool(tool) {
  currentTool = tool;
  wireStartConnector = null;

  selectButton.classList.remove("active");
  nodeButton.classList.remove("active");
  resistorButton.classList.remove("active");
  wireButton.classList.remove("active");

  if (tool === "select") selectButton.classList.add("active");
  if (tool === "node") nodeButton.classList.add("active");
  if (tool === "resistor") resistorButton.classList.add("active");
  if (tool === "wire") wireButton.classList.add("active");

  updateDrawing();
}

selectButton.addEventListener("click", () => setTool("select"));
nodeButton.addEventListener("click", () => setTool("node"));
resistorButton.addEventListener("click", () => setTool("resistor"));
wireButton.addEventListener("click", () => setTool("wire"));

// ==============================
// KIJELÖLÉS
// ==============================

function hidePropertySections() {
  nodeProperties.classList.add("hidden");
  resistorProperties.classList.add("hidden");
  wireProperties.classList.add("hidden");
  wirePointProperties.classList.add("hidden");
}

function clearSelection() {
  selectedElement = null;
  noSelection.classList.remove("hidden");
  hidePropertySections();
  updateDrawing();
}

function selectNode(node) {
  selectedElement = { type: "node", object: node };

  noSelection.classList.add("hidden");
  hidePropertySections();
  nodeProperties.classList.remove("hidden");

  nodeNameInput.value = node.name;
  updateDrawing();
}

function selectResistor(resistor) {
  selectedElement = { type: "resistor", object: resistor };

  noSelection.classList.add("hidden");
  hidePropertySections();
  resistorProperties.classList.remove("hidden");

  resistorNameInput.value = resistor.name;
  resistorValueInput.value = resistor.value;

  updateDrawing();
}

function selectWire(wire) {
  selectedElement = { type: "wire", object: wire };

  noSelection.classList.add("hidden");
  hidePropertySections();
  wireProperties.classList.remove("hidden");

  updateDrawing();
}

function selectWirePoint(wire, point) {
  selectedElement = {
    type: "wirePoint",
    object: point,
    wire: wire,
  };

  noSelection.classList.add("hidden");
  hidePropertySections();
  wirePointProperties.classList.remove("hidden");

  updateDrawing();
}

// ==============================
// POZÍCIÓ / SNAP
// ==============================

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getPointerPosition(event) {
  const rect = svg.getBoundingClientRect();

  return {
    x: snapToGrid(event.clientX - rect.left),
    y: snapToGrid(event.clientY - rect.top),
  };
}

// ==============================
// CSATLAKOZÓK
// ==============================

function makeNodeConnector(node) {
  return {
    type: "node",
    nodeId: node.id,
  };
}

function makeResistorConnector(resistor, side) {
  return {
    type: "resistorTerminal",
    resistorId: resistor.id,
    side: side,
  };
}

function connectorsEqual(a, b) {
  if (!a || !b || a.type !== b.type) {
    return false;
  }

  if (a.type === "node") {
    return a.nodeId === b.nodeId;
  }

  return a.resistorId === b.resistorId && a.side === b.side;
}

function getConnectorPosition(connector) {
  if (connector.type === "node") {
    const node = nodes.find((item) => item.id === connector.nodeId);
    return node ? { x: node.x, y: node.y } : null;
  }

  if (connector.type === "resistorTerminal") {
    const resistor = resistors.find(
      (item) => item.id === connector.resistorId,
    );

    if (!resistor) {
      return null;
    }

    const direction = connector.side === "left" ? -1 : 1;
    const angle = (resistor.rotation * Math.PI) / 180;

    return {
      x:
        resistor.x +
        Math.round(
          direction * RESISTOR_HALF_LENGTH * Math.cos(angle),
        ),
      y:
        resistor.y +
        Math.round(
          direction * RESISTOR_HALF_LENGTH * Math.sin(angle),
        ),
    };
  }

  return null;
}

function chooseWireConnector(connector) {
  if (wireStartConnector === null) {
    wireStartConnector = connector;
    updateDrawing();
    return;
  }

  if (!connectorsEqual(wireStartConnector, connector)) {
    createWire(wireStartConnector, connector);
  }

  wireStartConnector = null;
  updateDrawing();
}

function getRawPointerPosition(event) {
  const rect = svg.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function closestPointOnSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return {
      x: start.x,
      y: start.y,
      t: 0,
      distance: Math.hypot(point.x - start.x, point.y - start.y),
    };
  }

  let t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    (dx * dx + dy * dy);

  t = Math.max(0, Math.min(1, t));

  const x = start.x + t * dx;
  const y = start.y + t * dy;

  return {
    x,
    y,
    t,
    distance: Math.hypot(point.x - x, point.y - y),
  };
}

function getWireSegments(wire) {
  const start = getConnectorPosition(wire.start);
  const end = getConnectorPosition(wire.end);

  if (!start || !end) {
    return [];
  }

  const allPoints = [start, ...wire.points, end];

  return allPoints.slice(0, -1).map((segmentStart, index) => ({
    start: segmentStart,
    end: allPoints[index + 1],
    index,
  }));
}

function findWireAtPosition(position, maxDistance = 8) {
  let bestMatch = null;

  wires.forEach((wire) => {
    getWireSegments(wire).forEach((segment) => {
      const closest = closestPointOnSegment(
        position,
        segment.start,
        segment.end,
      );

      if (
        closest.distance <= maxDistance &&
        (!bestMatch || closest.distance < bestMatch.distance)
      ) {
        bestMatch = {
          wire,
          segmentIndex: segment.index,
          point: {
            x: snapToGrid(closest.x),
            y: snapToGrid(closest.y),
          },
          distance: closest.distance,
          segmentStart: segment.start,
          segmentEnd: segment.end,
        };
      }
    });
  });

  return bestMatch;
}

function removeWireElementOnly(wire) {
  wire.element.remove();

  if (wire.startHandle) {
    wire.startHandle.remove();
  }

  if (wire.endHandle) {
    wire.endHandle.remove();
  }

  wire.points.forEach((point) => {
    point.element.remove();
  });

  const index = wires.indexOf(wire);

  if (index !== -1) {
    wires.splice(index, 1);
  }
}

function createWirePointObject(x, y) {
  const point = {
    x,
    y,
    element: null,
  };

  const circle = createSVGElement("circle", {
    cx: x,
    cy: y,
    r: 6,
    fill: "white",
    stroke: "#1976d2",
    "stroke-width": 2,
    cursor: "grab",
  });

  point.element = circle;

  return point;
}

function attachWirePointEvents(wire, point) {
  point.element.addEventListener("pointerdown", (event) => {
    if (currentTool !== "select") {
      return;
    }

    event.stopPropagation();
    selectWirePoint(wire, point);
    startDraggingWirePoint(point, event);
  });
}

function createWireWithPoints(startConnector, endConnector, pointPositions = []) {
  const wire = createWire(startConnector, endConnector);

  pointPositions.forEach((position) => {
    const point = createWirePointObject(position.x, position.y);
    attachWirePointEvents(wire, point);
    svg.appendChild(point.element);
    wire.points.push(point);
  });

  updateDrawing();
  return wire;
}

function splitWireAtNode(match, node) {
  const wire = match.wire;
  const splitIndex = match.segmentIndex;

  const beforePoints = wire.points
    .slice(0, splitIndex)
    .map((point) => ({ x: point.x, y: point.y }));

  const afterPoints = wire.points
    .slice(splitIndex)
    .map((point) => ({ x: point.x, y: point.y }));

  const startConnector = { ...wire.start };
  const endConnector = { ...wire.end };
  const nodeConnector = makeNodeConnector(node);

  removeWireElementOnly(wire);

  createWireWithPoints(startConnector, nodeConnector, beforePoints);
  createWireWithPoints(nodeConnector, endConnector, afterPoints);
}

function getSegmentOrientation(match) {
  const dx = Math.abs(match.segmentEnd.x - match.segmentStart.x);
  const dy = Math.abs(match.segmentEnd.y - match.segmentStart.y);

  return dy > dx ? 90 : 0;
}

function splitWireAtResistor(match, resistor) {
  const wire = match.wire;
  const splitIndex = match.segmentIndex;

  const beforePoints = wire.points
    .slice(0, splitIndex)
    .map((point) => ({ x: point.x, y: point.y }));

  const afterPoints = wire.points
    .slice(splitIndex)
    .map((point) => ({ x: point.x, y: point.y }));

  const startConnector = { ...wire.start };
  const endConnector = { ...wire.end };

  const leftConnector = makeResistorConnector(resistor, "left");
  const rightConnector = makeResistorConnector(resistor, "right");

  const leftPosition = getConnectorPosition(leftConnector);
  const rightPosition = getConnectorPosition(rightConnector);

  const distanceStartToLeft = Math.hypot(
    match.segmentStart.x - leftPosition.x,
    match.segmentStart.y - leftPosition.y,
  );
  const distanceStartToRight = Math.hypot(
    match.segmentStart.x - rightPosition.x,
    match.segmentStart.y - rightPosition.y,
  );

  const firstConnector =
    distanceStartToLeft <= distanceStartToRight
      ? leftConnector
      : rightConnector;

  const secondConnector =
    firstConnector.side === "left"
      ? rightConnector
      : leftConnector;

  removeWireElementOnly(wire);

  createWireWithPoints(startConnector, firstConnector, beforePoints);
  createWireWithPoints(secondConnector, endConnector, afterPoints);
}

function findConnectorNear(position, maxDistance = 14) {
  let best = null;

  nodes.forEach((node) => {
    const connector = makeNodeConnector(node);
    const connectorPosition = getConnectorPosition(connector);
    const distance = Math.hypot(
      position.x - connectorPosition.x,
      position.y - connectorPosition.y,
    );

    if (
      distance <= maxDistance &&
      (!best || distance < best.distance)
    ) {
      best = { connector, distance };
    }
  });

  resistors.forEach((resistor) => {
    ["left", "right"].forEach((side) => {
      const connector = makeResistorConnector(resistor, side);
      const connectorPosition = getConnectorPosition(connector);
      const distance = Math.hypot(
        position.x - connectorPosition.x,
        position.y - connectorPosition.y,
      );

      if (
        distance <= maxDistance &&
        (!best || distance < best.distance)
      ) {
        best = { connector, distance };
      }
    });
  });

  return best ? best.connector : null;
}

function createWireEndpointHandle(wire, endpoint) {
  const handle = createSVGElement("circle", {
    r: 9,
    fill: "white",
    stroke: "#ff9800",
    "stroke-width": 3,
    cursor: "grab",
  });

  handle.addEventListener("pointerdown", (event) => {
    if (
      currentTool !== "select" ||
      !selectedElement ||
      selectedElement.type !== "wire" ||
      selectedElement.object !== wire
    ) {
      return;
    }

    event.stopPropagation();

    draggedWireEndpoint = { wire, endpoint };
    originalWireEndpointConnector = { ...wire[endpoint] };
    draggedWireEndpointPosition = getConnectorPosition(wire[endpoint]);

    beginDrag(handle, event.pointerId);
    handle.style.cursor = "grabbing";
    updateDrawing();
  });

  svg.appendChild(handle);
  return handle;
}

// ==============================
// ÚJ CSOMÓPONT
// ==============================

function createNode(x, y) {
  const name = String.fromCharCode(65 + nodeCounter);
  nodeCounter++;

  const node = {
    id: "node-" + nodeCounter,
    name: name,
    x: x,
    y: y,
  };

  const group = createSVGElement("g");

  const circle = createSVGElement("circle", {
    r: 8,
    fill: "black",
    cursor: "grab",
  });

  const label = createSVGElement("text", {
    x: 12,
    y: -12,
    "font-size": 16,
    "font-weight": "bold",
    "pointer-events": "none",
  });

  label.textContent = node.name;

  group.appendChild(circle);
  group.appendChild(label);
  svg.appendChild(group);

  node.group = group;
  node.circle = circle;
  node.label = label;

  circle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();

    if (currentTool === "select") {
      selectNode(node);
      startDraggingNode(node, event);
    } else if (currentTool === "wire") {
      chooseWireConnector(makeNodeConnector(node));
    }
  });

  nodes.push(node);
  updateDrawing();
  return node;
}

// ==============================
// ÚJ ELLENÁLLÁS
// ==============================

function createResistor(x, y) {
  const resistor = {
    id: "resistor-" + resistorCounter,
    name: "R" + resistorCounter,
    value: "100 Ω",
    x: x,
    y: y,
    rotation: 0,
  };

  resistorCounter++;

  const group = createSVGElement("g");

  const body = createSVGElement("rect", {
    x: -RESISTOR_HALF_LENGTH,
    y: -12,
    width: RESISTOR_HALF_LENGTH * 2,
    height: 24,
    fill: "white",
    stroke: "black",
    "stroke-width": 3,
    cursor: "grab",
  });

  const leftTerminal = createSVGElement("circle", {
    cx: -RESISTOR_HALF_LENGTH,
    cy: 0,
    r: 6,
    fill: "white",
    stroke: "#1976d2",
    "stroke-width": 2,
    cursor: "pointer",
  });

  const rightTerminal = createSVGElement("circle", {
    cx: RESISTOR_HALF_LENGTH,
    cy: 0,
    r: 6,
    fill: "white",
    stroke: "#1976d2",
    "stroke-width": 2,
    cursor: "pointer",
  });

  const nameText = createSVGElement("text", {
    x: 0,
    y: -25,
    "text-anchor": "middle",
    "font-size": 16,
    "pointer-events": "none",
  });

  const valueText = createSVGElement("text", {
    x: 0,
    y: 35,
    "text-anchor": "middle",
    "font-size": 14,
    "pointer-events": "none",
  });

  nameText.textContent = resistor.name;
  valueText.textContent = resistor.value;

  group.appendChild(body);
  group.appendChild(leftTerminal);
  group.appendChild(rightTerminal);
  group.appendChild(nameText);
  group.appendChild(valueText);
  svg.appendChild(group);

  resistor.group = group;
  resistor.body = body;
  resistor.leftTerminal = leftTerminal;
  resistor.rightTerminal = rightTerminal;
  resistor.nameText = nameText;
  resistor.valueText = valueText;

  body.addEventListener("pointerdown", (event) => {
    if (currentTool !== "select") {
      return;
    }

    event.stopPropagation();
    selectResistor(resistor);
    startDraggingResistor(resistor, event);
  });

  leftTerminal.addEventListener("pointerdown", (event) => {
    event.stopPropagation();

    if (currentTool === "wire") {
      chooseWireConnector(makeResistorConnector(resistor, "left"));
    }
  });

  rightTerminal.addEventListener("pointerdown", (event) => {
    event.stopPropagation();

    if (currentTool === "wire") {
      chooseWireConnector(makeResistorConnector(resistor, "right"));
    }
  });

  resistors.push(resistor);
  updateDrawing();
  return resistor;
}

// ==============================
// VEZETÉK
// ==============================

function createWire(startConnector, endConnector) {
  const wire = {
    id: "wire-" + wireCounter,
    start: { ...startConnector },
    end: { ...endConnector },
    points: [],
  };

  wireCounter++;

  const polyline = createSVGElement("polyline", {
    fill: "none",
    stroke: "black",
    "stroke-width": 3,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    cursor: "pointer",
  });

  svg.appendChild(polyline);
  wire.element = polyline;

  polyline.addEventListener("pointerdown", (event) => {
    if (currentTool === "select") {
      event.stopPropagation();
      selectWire(wire);
      return;
    }

    if (currentTool === "node") {
      event.stopPropagation();

      const rawPosition = getRawPointerPosition(event);
      const match = findWireAtPosition(rawPosition);

      if (!match || match.wire !== wire) {
        return;
      }

      const node = createNode(match.point.x, match.point.y);
      splitWireAtNode(match, node);
      return;
    }

    if (currentTool === "resistor") {
      event.stopPropagation();

      const rawPosition = getRawPointerPosition(event);
      const match = findWireAtPosition(rawPosition);

      if (!match || match.wire !== wire) {
        return;
      }

      const resistor = createResistor(match.point.x, match.point.y);
      resistor.rotation = getSegmentOrientation(match);
      updateDrawing();
      splitWireAtResistor(match, resistor);
    }
  });

  polyline.addEventListener("dblclick", (event) => {
    if (currentTool !== "select") {
      return;
    }

    event.stopPropagation();
    addWirePoint(wire, event);
  });

  wires.push(wire);

  wire.startHandle = createWireEndpointHandle(wire, "start");
  wire.endHandle = createWireEndpointHandle(wire, "end");

  updateDrawing();
  return wire;
}

// ==============================
// VEZETÉKTÖRÉSPONT
// ==============================

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  let t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    (dx * dx + dy * dy);

  t = Math.max(0, Math.min(1, t));

  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function addWirePoint(wire, event) {
  const position = getPointerPosition(event);
  const start = getConnectorPosition(wire.start);
  const end = getConnectorPosition(wire.end);

  if (!start || !end) {
    return;
  }

  const allPoints = [start, ...wire.points, end];

  let closestSegmentIndex = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const distance = distanceToSegment(
      position,
      allPoints[i],
      allPoints[i + 1],
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestSegmentIndex = i;
    }
  }

  const point = createWirePointObject(position.x, position.y);

  attachWirePointEvents(wire, point);
  svg.appendChild(point.element);

  wire.points.splice(closestSegmentIndex, 0, point);
  updateDrawing();
}

// ==============================
// RAJZTERÜLET KATTINTÁS
// ==============================

svg.addEventListener("pointerdown", (event) => {
  if (event.target !== svg && event.target !== gridBackground) {
    return;
  }

  if (currentTool === "select") {
    clearSelection();
    return;
  }

  const position = getPointerPosition(event);

  if (currentTool === "node") {
    createNode(position.x, position.y);
    return;
  }

  if (currentTool === "resistor") {
    createResistor(position.x, position.y);
  }
});

// ==============================
// DRAG & DROP
// ==============================

let draggedNode = null;
let draggedResistor = null;
let draggedWirePoint = null;
let dragPointerId = null;
let dragCaptureElement = null;

function beginDrag(element, pointerId) {
  dragPointerId = pointerId;
  dragCaptureElement = element;
  element.setPointerCapture(pointerId);
}

function startDraggingNode(node, event) {
  draggedNode = node;
  beginDrag(node.circle, event.pointerId);
  node.circle.style.cursor = "grabbing";
}

function startDraggingResistor(resistor, event) {
  draggedResistor = resistor;
  beginDrag(resistor.body, event.pointerId);
  resistor.body.style.cursor = "grabbing";
}

function startDraggingWirePoint(point, event) {
  draggedWirePoint = point;
  beginDrag(point.element, event.pointerId);
  point.element.style.cursor = "grabbing";
}

svg.addEventListener("pointermove", (event) => {
  if (
    dragPointerId === null ||
    event.pointerId !== dragPointerId
  ) {
    return;
  }

  const position = getPointerPosition(event);

  if (draggedWireEndpoint) {
    draggedWireEndpointPosition = position;
    updateDrawing();
    return;
  }

  if (draggedNode) {
    draggedNode.x = position.x;
    draggedNode.y = position.y;
    updateDrawing();
    return;
  }

  if (draggedResistor) {
    draggedResistor.x = position.x;
    draggedResistor.y = position.y;
    updateDrawing();
    return;
  }

  if (draggedWirePoint) {
    draggedWirePoint.x = position.x;
    draggedWirePoint.y = position.y;
    updateDrawing();
  }
});

svg.addEventListener("pointerup", (event) => {
  if (
    dragPointerId !== null &&
    event.pointerId === dragPointerId
  ) {
    if (draggedNode) {
      const mergeTarget = findMergeTarget(draggedNode);

      if (mergeTarget) {
        mergeNodes(draggedNode, mergeTarget);
      }
    }

    if (draggedWireEndpoint) {
      const targetConnector = findConnectorNear(
        draggedWireEndpointPosition,
      );

      if (
        targetConnector &&
        !connectorsEqual(
          targetConnector,
          draggedWireEndpoint.wire[
            draggedWireEndpoint.endpoint === "start"
              ? "end"
              : "start"
          ],
        )
      ) {
        draggedWireEndpoint.wire[
          draggedWireEndpoint.endpoint
        ] = { ...targetConnector };
      } else {
        draggedWireEndpoint.wire[
          draggedWireEndpoint.endpoint
        ] = { ...originalWireEndpointConnector };
      }
    }

    if (
      dragCaptureElement &&
      dragCaptureElement.hasPointerCapture(dragPointerId)
    ) {
      dragCaptureElement.releasePointerCapture(dragPointerId);
    }
  }

  if (draggedNode) {
    draggedNode.circle.style.cursor = "grab";
  }

  if (draggedResistor) {
    draggedResistor.body.style.cursor = "grab";
  }

  if (draggedWirePoint) {
    draggedWirePoint.element.style.cursor = "grab";
  }

  if (draggedWireEndpoint && dragCaptureElement) {
    dragCaptureElement.style.cursor = "grab";
  }

  draggedNode = null;
  draggedResistor = null;
  draggedWirePoint = null;
  draggedWireEndpoint = null;
  draggedWireEndpointPosition = null;
  originalWireEndpointConnector = null;
  dragPointerId = null;
  dragCaptureElement = null;

  updateDrawing();
});

// ==============================
// TULAJDONSÁGOK
// ==============================

nodeNameInput.addEventListener("input", () => {
  if (!selectedElement || selectedElement.type !== "node") {
    return;
  }

  selectedElement.object.name = nodeNameInput.value;
  updateDrawing();
});

resistorNameInput.addEventListener("input", () => {
  if (!selectedElement || selectedElement.type !== "resistor") {
    return;
  }

  selectedElement.object.name = resistorNameInput.value;
  updateDrawing();
});

resistorValueInput.addEventListener("input", () => {
  if (!selectedElement || selectedElement.type !== "resistor") {
    return;
  }

  selectedElement.object.value = resistorValueInput.value;
  updateDrawing();
});

rotateResistorButton.addEventListener("click", () => {
  if (!selectedElement || selectedElement.type !== "resistor") {
    return;
  }

  const resistor = selectedElement.object;
  resistor.rotation = (resistor.rotation + 90) % 360;

  updateDrawing();
});

// ==============================
// TÖRLÉS
// ==============================

function removeWire(wire) {
  wire.element.remove();

  if (wire.startHandle) {
    wire.startHandle.remove();
  }

  if (wire.endHandle) {
    wire.endHandle.remove();
  }

  wire.points.forEach((point) => {
    point.element.remove();
  });

  const index = wires.indexOf(wire);

  if (index !== -1) {
    wires.splice(index, 1);
  }
}

deleteWireButton.addEventListener("click", () => {
  if (!selectedElement || selectedElement.type !== "wire") {
    return;
  }

  removeWire(selectedElement.object);
  clearSelection();
});

deleteWirePointButton.addEventListener("click", () => {
  if (!selectedElement || selectedElement.type !== "wirePoint") {
    return;
  }

  const wire = selectedElement.wire;
  const point = selectedElement.object;

  point.element.remove();

  const pointIndex = wire.points.indexOf(point);

  if (pointIndex !== -1) {
    wire.points.splice(pointIndex, 1);
  }

  clearSelection();
});

deleteNodeButton.addEventListener("click", () => {
  if (!selectedElement || selectedElement.type !== "node") {
    return;
  }

  const node = selectedElement.object;

  for (let i = wires.length - 1; i >= 0; i--) {
    const wire = wires[i];

    const touchesNode =
      (wire.start.type === "node" && wire.start.nodeId === node.id) ||
      (wire.end.type === "node" && wire.end.nodeId === node.id);

    if (touchesNode) {
      removeWire(wire);
    }
  }

  node.group.remove();

  const nodeIndex = nodes.indexOf(node);

  if (nodeIndex !== -1) {
    nodes.splice(nodeIndex, 1);
  }

  clearSelection();
});

deleteResistorButton.addEventListener("click", () => {
  if (!selectedElement || selectedElement.type !== "resistor") {
    return;
  }

  const resistor = selectedElement.object;

  for (let i = wires.length - 1; i >= 0; i--) {
    const wire = wires[i];

    const touchesResistor =
      (wire.start.type === "resistorTerminal" &&
        wire.start.resistorId === resistor.id) ||
      (wire.end.type === "resistorTerminal" &&
        wire.end.resistorId === resistor.id);

    if (touchesResistor) {
      removeWire(wire);
    }
  }

  resistor.group.remove();

  const index = resistors.indexOf(resistor);

  if (index !== -1) {
    resistors.splice(index, 1);
  }

  clearSelection();
});

// ==============================
// CSOMÓPONT ÖSSZEVONÁS
// ==============================

function findMergeTarget(draggedNode) {
  return (
    nodes.find(
      (node) =>
        node !== draggedNode &&
        node.x === draggedNode.x &&
        node.y === draggedNode.y,
    ) || null
  );
}

function replaceNodeConnector(connector, sourceNode, targetNode) {
  if (
    connector.type === "node" &&
    connector.nodeId === sourceNode.id
  ) {
    connector.nodeId = targetNode.id;
  }
}

function mergeNodes(sourceNode, targetNode) {
  if (!sourceNode || !targetNode || sourceNode === targetNode) {
    return;
  }

  wires.forEach((wire) => {
    replaceNodeConnector(wire.start, sourceNode, targetNode);
    replaceNodeConnector(wire.end, sourceNode, targetNode);
  });

  if (
    wireStartConnector &&
    wireStartConnector.type === "node" &&
    wireStartConnector.nodeId === sourceNode.id
  ) {
    wireStartConnector.nodeId = targetNode.id;
  }

  sourceNode.group.remove();

  const sourceIndex = nodes.indexOf(sourceNode);

  if (sourceIndex !== -1) {
    nodes.splice(sourceIndex, 1);
  }

  if (
    selectedElement &&
    selectedElement.type === "node" &&
    selectedElement.object === sourceNode
  ) {
    selectNode(targetNode);
  }

  updateDrawing();
}

// ==============================
// RAJZ FRISSÍTÉSE
// ==============================

function updateDrawing() {
  nodes.forEach((node) => {
    node.group.setAttribute(
      "transform",
      `translate(${node.x} ${node.y})`,
    );

    const connectorSelected =
      wireStartConnector &&
      wireStartConnector.type === "node" &&
      wireStartConnector.nodeId === node.id;

    if (connectorSelected) {
      node.circle.setAttribute("fill", "#e53935");
    } else if (
      selectedElement &&
      selectedElement.type === "node" &&
      selectedElement.object === node
    ) {
      node.circle.setAttribute("fill", "#1976d2");
    } else {
      node.circle.setAttribute("fill", "black");
    }

    node.label.textContent = node.name;
  });

  resistors.forEach((resistor) => {
    resistor.group.setAttribute(
      "transform",
      `translate(${resistor.x} ${resistor.y})`,
    );

    resistor.body.setAttribute(
      "transform",
      `rotate(${resistor.rotation})`,
    );

    resistor.leftTerminal.setAttribute(
      "transform",
      `rotate(${resistor.rotation})`,
    );

    resistor.rightTerminal.setAttribute(
      "transform",
      `rotate(${resistor.rotation})`,
    );

    resistor.nameText.textContent = resistor.name;
    resistor.valueText.textContent = resistor.value;

    if (resistor.rotation % 180 === 0) {
      resistor.nameText.setAttribute("x", 0);
      resistor.nameText.setAttribute("y", -25);
      resistor.nameText.setAttribute("text-anchor", "middle");

      resistor.valueText.setAttribute("x", 0);
      resistor.valueText.setAttribute("y", 35);
      resistor.valueText.setAttribute("text-anchor", "middle");
    } else {
      resistor.nameText.setAttribute("x", 22);
      resistor.nameText.setAttribute("y", -6);
      resistor.nameText.setAttribute("text-anchor", "start");

      resistor.valueText.setAttribute("x", 22);
      resistor.valueText.setAttribute("y", 14);
      resistor.valueText.setAttribute("text-anchor", "start");
    }

    if (
      selectedElement &&
      selectedElement.type === "resistor" &&
      selectedElement.object === resistor
    ) {
      resistor.body.setAttribute("stroke", "#1976d2");
      resistor.body.setAttribute("stroke-width", 4);
    } else {
      resistor.body.setAttribute("stroke", "black");
      resistor.body.setAttribute("stroke-width", 3);
    }

    const leftSelected =
      wireStartConnector &&
      wireStartConnector.type === "resistorTerminal" &&
      wireStartConnector.resistorId === resistor.id &&
      wireStartConnector.side === "left";

    const rightSelected =
      wireStartConnector &&
      wireStartConnector.type === "resistorTerminal" &&
      wireStartConnector.resistorId === resistor.id &&
      wireStartConnector.side === "right";

    resistor.leftTerminal.setAttribute(
      "fill",
      leftSelected ? "#e53935" : "white",
    );

    resistor.rightTerminal.setAttribute(
      "fill",
      rightSelected ? "#e53935" : "white",
    );

    const terminalOpacity = currentTool === "wire" ? "1" : "0.45";
    resistor.leftTerminal.setAttribute("opacity", terminalOpacity);
    resistor.rightTerminal.setAttribute("opacity", terminalOpacity);
  });

  wires.forEach((wire) => {
    let start = getConnectorPosition(wire.start);
    let end = getConnectorPosition(wire.end);

    if (
      draggedWireEndpoint &&
      draggedWireEndpoint.wire === wire &&
      draggedWireEndpointPosition
    ) {
      if (draggedWireEndpoint.endpoint === "start") {
        start = draggedWireEndpointPosition;
      } else {
        end = draggedWireEndpointPosition;
      }
    }

    if (!start || !end) {
      return;
    }

    const allPoints = [start, ...wire.points, end];

    wire.element.setAttribute(
      "points",
      allPoints
        .map((point) => `${point.x},${point.y}`)
        .join(" "),
    );

    if (
      selectedElement &&
      selectedElement.type === "wire" &&
      selectedElement.object === wire
    ) {
      wire.element.setAttribute("stroke", "#1976d2");
      wire.element.setAttribute("stroke-width", 5);
    } else {
      wire.element.setAttribute("stroke", "black");
      wire.element.setAttribute("stroke-width", 3);
    }

    const wireSelected =
      selectedElement &&
      selectedElement.type === "wire" &&
      selectedElement.object === wire &&
      currentTool === "select";

    wire.startHandle.setAttribute("cx", start.x);
    wire.startHandle.setAttribute("cy", start.y);
    wire.endHandle.setAttribute("cx", end.x);
    wire.endHandle.setAttribute("cy", end.y);

    wire.startHandle.style.display = wireSelected ? "" : "none";
    wire.endHandle.style.display = wireSelected ? "" : "none";

    wire.points.forEach((point) => {
      point.element.setAttribute("cx", point.x);
      point.element.setAttribute("cy", point.y);

      if (
        selectedElement &&
        selectedElement.type === "wirePoint" &&
        selectedElement.object === point
      ) {
        point.element.setAttribute("fill", "#1976d2");
        point.element.setAttribute("stroke", "#0d47a1");
      } else {
        point.element.setAttribute("fill", "white");
        point.element.setAttribute("stroke", "#1976d2");
      }
    });
  });
}
