import { rgbToHex, hexToRGB, getDistance } from "/core/commons.js";

/**
 * MouseGestureView "singleton"
 * provides multiple functions to manipulate the overlay
 **/


// public methods and variables


export default {
  initialize: initialize,
  updateGestureTrace: updateGestureTrace,
  updateGestureCommand: updateGestureCommand,
  terminate: terminate,
  
  // gesture Trace styles

  get gestureTraceLineColor () {
    const rgbHex = Context.fillStyle;
    const alpha = parseFloat(Canvas.style.getPropertyValue("opacity")) || 1;
    const aHex = Math.round(alpha * 255).toString(16);
    return rgbHex + aHex;
  },
  set gestureTraceLineColor (value) {
    const rgbHex = value.substring(0, 7);
    const aHex = value.slice(7);
    const alpha = parseInt(aHex, 16)/255;
    Context.fillStyle = rgbHex;
    Canvas.style.setProperty("opacity", alpha, "important");
  },

  get gestureTraceLineWidth () {
    return gestureTraceLineWidth;
  },
  set gestureTraceLineWidth (value) {
    gestureTraceLineWidth = value;
  },

  get gestureTraceLineGrowth () {
    return gestureTraceLineGrowth;
  },
  set gestureTraceLineGrowth (value) {
    gestureTraceLineGrowth = Boolean(value);
  },

  // gesture command styles

  get gestureCommandFontSize () {
    return Command.style.getPropertyValue('font-size');
  },
  set gestureCommandFontSize (value) {
    Command.style.setProperty('font-size', value, 'important');
  },

  get gestureCommandFontColor () {
    return Command.style.getPropertyValue('color');
  },
  set gestureCommandFontColor (value) {
    Command.style.setProperty('color', value, 'important');
  },

  get gestureCommandBackgroundColor () {
    return Command.style.getPropertyValue('background-color');
  },
  set gestureCommandBackgroundColor (value) {
    Command.style.setProperty('background-color', value);
  },

  get gestureCommandHorizontalPosition () {
    return parseFloat(Command.style.getPropertyValue("--horizontalPosition"));
  },
  set gestureCommandHorizontalPosition (value) {
    Command.style.setProperty("--horizontalPosition", value);
  },

  get gestureCommandVerticalPosition () {
    return parseFloat(Command.style.getPropertyValue("--verticalPosition"));
  },
  set gestureCommandVerticalPosition (value) {
    Command.style.setProperty("--verticalPosition", value);
  }
};


/**
 * appand overlay and start drawing the gesture
 **/
function initialize (x, y) {
  // overlay is not working in a pure svg page thus do not append the overlay
  if (document.documentElement.tagName.toUpperCase() === "SVG") return;

  if (document.body.tagName.toUpperCase() === "FRAMESET") {
    document.documentElement.appendChild(Overlay);
  }
  else {
    document.body.appendChild(Overlay);
  }
  // store starting point
  lastPoint.x = x;
  lastPoint.y = y;
}


/**
 * draw line for gesture
 */
function updateGestureTrace (points) {
  if (!Overlay.contains(Canvas)) Overlay.appendChild(Canvas);

  // temporary path in order draw all segments in one call
  const path = new Path2D();
  
  for (let point of points) {
    if (gestureTraceLineGrowth && lastTraceWidth < gestureTraceLineWidth) {
      // the length in pixels after which the line should be grown to its final width
      // in this case the length depends on the final width defined by the user
      const growthDistance = gestureTraceLineWidth * 50;
      // the distance from the last point to the current
      const distance = getDistance(lastPoint.x, lastPoint.y, point.x, point.y);
      // cap the line width by its final width value
      const currentTraceWidth = Math.min(
        lastTraceWidth + distance / growthDistance * gestureTraceLineWidth,
        gestureTraceLineWidth
      );
      const pathSegment = createGrowingLine(lastPoint.x, lastPoint.y, point.x, point.y, lastTraceWidth, currentTraceWidth);
      path.addPath(pathSegment);

      lastTraceWidth = currentTraceWidth;
    }
    else {
      const pathSegment = createGrowingLine(lastPoint.x, lastPoint.y, point.x, point.y, gestureTraceLineWidth, gestureTraceLineWidth);
      path.addPath(pathSegment);
    }
    
    lastPoint.x = point.x;
    lastPoint.y = point.y;
  }
  // draw accumulated path segments
  Context.fill(path);
}


/**
 * update command on match
 **/
function updateGestureCommand (command) {
  if (command) {
    if (!Overlay.contains(Command)) Overlay.appendChild(Command);
    Command.textContent = command;
  }
  else Command.remove();
}


/**
 * remove and reset overlay
 **/
function terminate () {
  Overlay.remove();
  Canvas.remove();
  Command.remove();
  // clear canvas
  Context.clearRect(0, 0, Canvas.width, Canvas.height);
  // reset trace line width
  lastTraceWidth = 0;
  Command.textContent = "";
}


// private variables and methods


// also used to caputre the mouse events over iframes
const Overlay = document.createElement("div");
      Overlay.style = `
        all: initial !important;
        position: fixed !important;
        top: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 2147483647 !important;

        pointer-events: none !important;
      `;

const Canvas = document.createElement("canvas");
      Canvas.style = `
        all: initial !important;
        
        pointer-events: none !important;
      `;

const Context = Canvas.getContext('2d');

const Command = document.createElement("div");
      Command.style = `
        --horizontalPosition: 0;
        --verticalPosition: 0;
        all: initial !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        transform: translate(calc(var(--horizontalPosition) * 1vw - var(--horizontalPosition) * 1%), calc(var(--verticalPosition) * 1vh - var(--verticalPosition) * 1%)) !important;
        font-family: "NunitoSans Regular", "Arial", sans-serif !important;
        line-height: normal !important;
        text-shadow: 0.01em 0.01em 0.01em rgba(0,0,0, 0.5) !important;
        text-align: center !important;
        padding: 0.4em 0.4em 0.3em !important;
        font-weight: bold !important;
        background-color: rgba(0,0,0,0) !important;
        
        pointer-events: none !important;
      `;


let gestureTraceLineWidth = 10,
    gestureTraceLineGrowth = true;


let lastTraceWidth = 0,
    lastPoint = { x: 0, y: 0 };


// resize canvas on window resize
window.addEventListener('resize', maximizeCanvas, true);
maximizeCanvas();


/**
 * Adjust the canvas size to the size of the window
 **/
function maximizeCanvas () {
  // save context properties, because they get cleared on canvas resize
  const tmpContext = {
    lineCap: Context.lineCap,
    lineJoin: Context.lineJoin,
    fillStyle: Context.fillStyle,
    strokeStyle: Context.strokeStyle,
    lineWidth: Context.lineWidth
  }; 

  Canvas.width = window.innerWidth;
  Canvas.height = window.innerHeight;

  // restore previous context properties
  Object.assign(Context, tmpContext);
}


/**
 * creates a growing line from a starting point and strike width to an end point and stroke width
 * returns a path 2d object
 **/
function createGrowingLine (x1, y1, x2, y2, startWidth, endWidth) {
  // calculate direction vector of point 1 and 2
  const directionVectorX = x2 - x1,
        directionVectorY = y2 - y1;
  // calculate angle of perpendicular vector
  const perpendicularVectorAngle = Math.atan2(directionVectorY, directionVectorX) + Math.PI/2;
  // construct shape
  const path = new Path2D();
        path.arc(x1, y1, startWidth/2, perpendicularVectorAngle, perpendicularVectorAngle + Math.PI);
        path.arc(x2, y2, endWidth/2, perpendicularVectorAngle + Math.PI, perpendicularVectorAngle);
        path.closePath();
  return path;
}