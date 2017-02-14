/*============================================================================
  Filename: Cango3D-7v10.js
  By: A.R.Collins

  A basic 3D graphics interface for the canvas
  element using Right Handed coordinate system.

  Kindly give credit to Dr A R Collins <http://www.arc.id.au/>
  Report bugs to tony at arc.id.au

  Date   |Description                                                     |By
  ----------------------------------------------------------------------------
  05May13 First beta after major re-write: soft transforms
          now applied by Group3D method not by render3D.
          Transforms now use grpTfm, ofsTfm, netTfm                        ARC
  17May13 Release 3v19                                                     ARC
  09Sep13 Release 4v00                                                     ARC
  04Jun14 Release 5v00                                                     ARC
  28Jun14 Release 6v00 from 6beta-38                                       ARC
  16Aug14 Update dragNdrop, Drag3D becomes private,
          enableDrag takes callbacks as arguments.
          Released as 7v00                                                 ARC
  14Dec14 Adjusted Hershey fontSize to match canvas fontSzie               ARC
  25Jun15 Refactor for readability
          Renamed Transform3D to TransformMatrix
          shapeDefs.circle & ellipse had 'm' z coord missing               ARC
  28Jun15 Cleanup all the application of transforms in render
          Use functional programming version of the svgParser              ARC
  04Jan14 Don't set Cango3D.ctx values in setPropertyDefault, redundant
          Fix scoping errors to keep JSLint happy                          ARC
  ============================================================================*/

  // exposed globals
  var Cango3D, Obj3D, Group3D,
      svgToCgo3D, // SVG path data string conversion utility function
      calcNormal, calcIncAngle,
      shapes3D;   // predefined geometric shapes in Cgo3D format

(function()
{
  "use strict";

  var cgo3DtoDrawCmd3D,
      hersheyFont = { };

  if (!Date.now)
  {
    Date.now = function now()
    {
      return new Date().getTime();
    };
  }

  var isArray = function(obj)
  {
    return Array.isArray(obj);
  };

  var isNumber = function(o)
  {
    return !isNaN(o) && o !== null && o !== "" && o !== false;
  };

  // simple add event handler that has the handlers called in the sequence that they were set
  var addLoadEvent = function(obj, func)
  {
  	var oldonload = obj.onload;

  	if (typeof(obj.onload) !== "function")
    {
      obj.onload = func;
    }
  	else
    {
    	obj.onload = function(){ oldonload(); func(); };
    }
  };

  var addEvent = function(element, eventType, handler)
  {
    if (element.attachEvent)
    {
     return element.attachEvent('on'+eventType, handler);
    }
    return element.addEventListener(eventType, handler, false);
  };

  var removeEvent = function(element, eventType, handler)
  {
   if (element.removeEventListener)
   {
      element.removeEventListener (eventType, handler, false);
   }
   if (element.detachEvent)
   {
      element.detachEvent ('on'+eventType, handler);
   }
  };

  if (!Array.prototype.contains)
  {
    Array.prototype.contains = function(obj)
    {
      var i = this.length;
      while (i--)
      {
        if (this[i] === obj)
        {
          return true;
        }
      }
      return false;
    };
  }

  /* ====================================================================
   * A 3D coordinate (right handed system)
   *
   * X +ve right
   * Y +ve up
   * Z +ve out screen
   * --------------------------------------------------------------------
   */
  function Point(x, y, z)
  {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;

    // Translated, rotated, scaled
    this.tx = this.x;
    this.ty = this.y;
    this.tz = this.z;

    // tx, ty, tz, projected to 2D as seen from viewpoint
    this.fx = 0;
    this.fy = 0;
  }

  Point.prototype.hardTransform = function(m)
  {
    var a1 = this.x;
    var a2 = this.y;
    var a3 = this.z;
    var a4 = 1;

    var b11 = m[0][0];
    var b12 = m[0][1];
    var b13 = m[0][2];
//    var b14 = m[0][3];
    var b21 = m[1][0];
    var b22 = m[1][1];
    var b23 = m[1][2];
//    var b24 = m[1][3];
    var b31 = m[2][0];
    var b32 = m[2][1];
    var b33 = m[2][2];
//    var b34 = m[2][3];
    var b41 = m[3][0];
    var b42 = m[3][1];
    var b43 = m[3][2];
//    var b44 = m[3][3];

    this.x = this.tx = a1 * b11 + a2 * b21 + a3 * b31 + a4 * b41;
    this.y = this.ty = a1 * b12 + a2 * b22 + a3 * b32 + a4 * b42;
    this.z = this.tz = a1 * b13 + a2 * b23 + a3 * b33 + a4 * b43;
  };

  Point.prototype.softTransform = function(m)
  {
    var a1 = this.x;
    var a2 = this.y;
    var a3 = this.z;
    var a4 = 1;

    var b11 = m[0][0];
    var b12 = m[0][1];
    var b13 = m[0][2];
//    var b14 = m[0][3];
    var b21 = m[1][0];
    var b22 = m[1][1];
    var b23 = m[1][2];
//    var b24 = m[1][3];
    var b31 = m[2][0];
    var b32 = m[2][1];
    var b33 = m[2][2];
//    var b34 = m[2][3];
    var b41 = m[3][0];
    var b42 = m[3][1];
    var b43 = m[3][2];
//    var b44 = m[3][3];

    this.tx = a1 * b11 + a2 * b21 + a3 * b31 + a4 * b41;
    this.ty = a1 * b12 + a2 * b22 + a3 * b32 + a4 * b42;
    this.tz = a1 * b13 + a2 * b23 + a3 * b33 + a4 * b43;
  };

  /* =============================================================
   * DrawCmd3D
   * - drawFn: String, the canvas draw command name
   * - cPts: Array, [Point, Point ...] Bezier curve control points
   * - ep: Point, end point of the drawFn
   *-------------------------------------------------------------*/
  function DrawCmd3D(cmdStr, controlPoints, endPoint)
  {
    this.drawFn = cmdStr;             // String version of the canvas command to call
    this.cPts = controlPoints || [];  // [Point, Point ...] Bezier curve control points
    this.ep = endPoint;               // Point will  be undefined for 'closePath' drawFn
    this.parms = [];                  // 2D world coordinate version of cPts and ep
    this.parmsPx = [];                // 2D pixel coordinate version of cPts and ep
  }

  /* ========================================================================
   * This svgParser is an object with 2 methods.
   *
   * svg2cgo3d: Converts SVG format 2D data which can be either a String or an
   * Array in format "M, x, y, L, x, y ... " or ['M', x, y, 'L', x, y ... ]
   * to Cgo3D array ['M',x,y,z, 'L',x,y,z, ... 'Q',cx,cy,cz,x,y,z ]
   * Path data from SVG editors often have the drawing origin offset a long
   * way, xRef, yRef will be added to all coords to correct this
   * NOTE: String format data is assumed to be Y +ve down and so all
   * Y coordinates are flipped in sign. This does not happen to array data.
   *
   * cgo3DtoDrawcmd: Converts an array of Cgo3D dta if the format
   * ['M',x,y,z, 'L',x,y,z, ... 'Q',cx,cy,cz,x,y,z, 'Z'] to DrawCmd3D objects
   * -----------------------------------------------------------------------*/
  var svgParser = (function ()
  {
    var segmentToBezier = function(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
          var a00 = cos_th * rx,
              a01 = -sin_th * ry,
              a10 = sin_th * rx,
              a11 = cos_th * ry,
              th_half = 0.5 * (th1 - th0),
              t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half),
              x1 = cx + Math.cos(th0) - t * Math.sin(th0),
              y1 = cy + Math.sin(th0) + t * Math.cos(th0),
              x3 = cx + Math.cos(th1),
              y3 = cy + Math.sin(th1),
              x2 = x3 + t * Math.sin(th1),
              y2 = y3 - t * Math.cos(th1);

          return [ a00 * x1 + a01 * y1, a10 * x1 + a11 * y1, 0,    // add the z coord here
                   a00 * x2 + a01 * y2, a10 * x2 + a11 * y2, 0,
                   a00 * x3 + a01 * y3, a10 * x3 + a11 * y3, 0 ];
        },
        arcToBezier = function(ox, oy, radx, rady, rotateX, large, sweep, x, y)
        {
          var th = rotateX * (Math.PI/180),
              sin_th = Math.sin(th),
              cos_th = Math.cos(th),
              rx = Math.abs(radx),
              ry = Math.abs(rady),
              px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5,
              py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5,
              pl = (px*px) / (rx*rx) + (py*py) / (ry*ry),
              a00, a01, a10, a11,
              x0, y0, x1, y1,
              d,
              sfactor_sq,
              sfactor,
              xc, yc,
              th0, th1,
              th_arc,
              segments,
              seg, tidySeg,
              result = [],
              i, th2, th3;

          function roundZeros(coord)
          {
            return ((Math.abs(coord) < 0.00001)? 0: coord);
          }

          if (pl > 1)
          {
            pl = Math.sqrt(pl);
            rx *= pl;
            ry *= pl;
          }
          a00 = cos_th / rx;
          a01 = sin_th / rx;
          a10 = -sin_th / ry;
          a11 = cos_th / ry;
          x0 = a00 * ox + a01 * oy;
          y0 = a10 * ox + a11 * oy;
          x1 = a00 * x + a01 * y;
          y1 = a10 * x + a11 * y;
          d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0);
          sfactor_sq = 1 / d - 0.25;
          if (sfactor_sq < 0)
          {
            sfactor_sq = 0;
          }
          sfactor = Math.sqrt(sfactor_sq);
          if (sweep === large)
          {
            sfactor = -sfactor;
          }
          xc = 0.5 * (x0 + x1) - sfactor * (y1-y0);
          yc = 0.5 * (y0 + y1) + sfactor * (x1-x0);
          th0 = Math.atan2(y0-yc, x0-xc);
          th1 = Math.atan2(y1-yc, x1-xc);
          th_arc = th1-th0;
          if (th_arc < 0 && sweep === 1)
          {
            th_arc += 2*Math.PI;
          }
          else if (th_arc > 0 && sweep === 0)
          {
            th_arc -= 2 * Math.PI;
          }
          segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
          for (i=0; i<segments; i++)
          {
            th2 = th0 + i * th_arc / segments;
            th3 = th0 + (i+1) * th_arc / segments;
            seg = segmentToBezier(xc, yc, th2, th3, rx, ry, sin_th, cos_th);
            tidySeg = seg.map(roundZeros);
            result.push(tidySeg);
          }

          return result;
        },
        /*===============================================
         *
         * svgProtocol object defining each command
         * with methods to convert to Cgo2D for both
         * cartesian and SVG coordinate systems
         *
         *==============================================*/
        svgProtocol = {
          "M": {
            parmCount: 2,
            parmCount3D: 3,
            extCmd: "L",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  x = curr[1],
                  y = curr[2],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toAbs3D: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  x = curr[1],
                  y = curr[2],
                  z = curr[3],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
                y += acc.py;
                z += acc.pz;
              }
              currAbs = [cmd, x, y, z];
              acc.px = x;
              acc.py = y;
              acc.pz = z;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var cmd = curr[0],
                  x = curr[1],
                  y = curr[2],
                  z = 0;

              acc.px = x;  // update the pen position for next command
              acc.py = y;
              acc.push([cmd, x, y, z]); // push the curr, "M" is a Cango internal command
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var x = curr[1],
                  y = curr[2];

              x += xOfs;
              y += yOfs;
              return ["M", x, y];   // invert y coords to make Cgo2D format
            },
            invertCoords: function(curr){
              var x = curr[1],
                  y = curr[2];

              return ["M", x, -y];   // invert y coords to make Cgo2D format
            },
            toDrawCmd: function(curr){
              var x = curr[1],
                  y = curr[2],
                  z = curr[3],
                  cPts = [],
                  ep = new Point(x, y, z);

              return new DrawCmd3D('moveTo', cPts, ep);
            }
          },
          "L": {
            parmCount: 2,
            parmCount3D: 3,
            extCmd: "L",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  x = curr[1],
                  y = curr[2],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toAbs3D: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  x = curr[1],
                  y = curr[2],
                  z = curr[3],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
                y += acc.py;
                z += acc.pz;
              }
              currAbs = [cmd, x, y, z];
              acc.px = x;
              acc.py = y;
              acc.pz = z;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var cmd = curr[0],
                  x = curr[1],
                  y = curr[2],
                  z = 0;

              acc.px = x;  // update the pen position for next command
              acc.py = y;
              acc.push([cmd, x, y, z]); // push the curr, "L" is a Cango internal command
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var x = curr[1],
                  y = curr[2];

              x += xOfs;
              y += yOfs;
              return ["L", x, y];   // invert y coords to make Cgo2D format
            },
            invertCoords: function(curr){
              var x = curr[1],
                  y = curr[2];

              return ["L", x, -y];   // invert y coords to make Cgo2D format
            },
            toDrawCmd: function(curr){
              var x = curr[1],
                  y = curr[2],
                  z = curr[3],
                  cPts = [],
                  ep = new Point(x, y, z);

              return new DrawCmd3D('lineTo', cPts, ep);
            }
          },
          "H": {
            parmCount: 1,
            extCmd: "H",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),   // uppercase command means absolute coords
                  x = curr[1],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
              }
              currAbs = [cmd, x];
              acc.px = x;        // save the new pen position
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var x = curr[1],
                  y = acc.py,
                  z = 0,
                  cangoVer = ["L", x, y, z];

              acc.px = x;        // save the new pen position
              acc.push(cangoVer);
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var x = curr[1];

              x += xOfs;
              return ["H", x];
            },
            invertCoords: function(curr){
              var x = curr[1];

              return ["H", x];
            }
          },
          "V": {
            parmCount: 1,
            extCmd: "V",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),   // uppercase command means absolute coords
                  y = curr[1],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                y += acc.py;
              }
              currAbs = [cmd, y];
              acc.py = y;        // save the new pen position
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var x = acc.px,
                  y = curr[1],
                  z = 0,
                  cangoVer = ["L", x, y, z];

              acc.py = y;        // save the new pen position
              acc.push(cangoVer);
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var y = curr[1];

              y += yOfs;
              return ["V", y];    // invert y coords to make Cgo2D format
            },
            invertCoords: function(curr){
              var y = curr[1];

              return ["V", -y];    // invert y coords to make Cgo2D format
            }
          },
          "C": {       // Cubic Bezier curve
            parmCount: 6,
            parmCount3D: 9,
            extCmd: "C",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  c1x = curr[1],
                  c1y = curr[2],
                  c2x = curr[3],
                  c2y = curr[4],
                  x = curr[5],
                  y = curr[6],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                c1x += acc.px;
                c1y += acc.py;
                c2x += acc.px;
                c2y += acc.py;
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, c1x, c1y, c2x, c2y, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toAbs3D: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  c1x = curr[1],
                  c1y = curr[2],
                  c1z = curr[3],
                  c2x = curr[4],
                  c2y = curr[5],
                  c2z = curr[6],
                  x = curr[7],
                  y = curr[8],
                  z = curr[9],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                c1x += acc.px;
                c1y += acc.py;
                c1z += acc.pz;
                c2x += acc.px;
                c2y += acc.py;
                c2z += acc.pz;
                x += acc.px;
                y += acc.py;
                z += acc.pz;
              }
              currAbs = [cmd, c1x, c1y, c1z, c2x, c2y, c2z, x, y, z];
              acc.px = x;
              acc.py = y;
              acc.pz = z;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var cmd = curr[0],
                  c1x = curr[1],
                  c1y = curr[2],
                  c1z = 0,
                  c2x = curr[3],
                  c2y = curr[4],
                  c2z = 0,
                  x = curr[5],
                  y = curr[6],
                  z = 0;

              acc.px = x;  // update the pen position for next command
              acc.py = y;
              acc.push([cmd, c1x, c1y, c1z, c2x, c2y, c2z, x, y, z]); // push the curr, "C" is a Cango internal command
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var c1x = curr[1],
                  c1y = curr[2],
                  c2x = curr[3],
                  c2y = curr[4],
                  x = curr[5],
                  y = curr[6];

                c1x += xOfs;
                c1y += yOfs;
                c2x += xOfs;
                c2y += yOfs;
                x += xOfs;
                y += yOfs;
              return ["C", c1x, c1y, c2x, c2y, x, y]; // invert y coords
            },
            invertCoords: function(curr){
              var c1x = curr[1],
                  c1y = curr[2],
                  c2x = curr[3],
                  c2y = curr[4],
                  x = curr[5],
                  y = curr[6];

              return ["C", c1x, -c1y, c2x, -c2y, x, -y]; // invert y coords
            },
            toDrawCmd: function(curr){
              var c1x = curr[1],
                  c1y = curr[2],
                  c1z = curr[3],
                  c2x = curr[4],
                  c2y = curr[5],
                  c2z = curr[6],
                  x = curr[7],
                  y = curr[8],
                  z = curr[9],
                  cp1 = new Point(c1x, c1y, c1z),
                  cp2 = new Point(c2x, c2y, c2z),
                  cPts = [cp1, cp2],
                  ep = new Point(x, y, z);

              return new DrawCmd3D('bezierCurveTo', cPts, ep);
            }
          },
          "S": {         // Smooth cubic Bezier curve
            parmCount: 4,
            extCmd: "S",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase means absolute coords
                  c2x = curr[1],
                  c2y = curr[2],
                  x = curr[3],
                  y = curr[4],
                  currAbs;

              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                c2x += acc.px;
                c2y += acc.py;
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, c2x, c2y, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr, idx) {
              var c1x = 0,    // relative coords of first (mirrored) control point
                  c1y = 0,
                  c1z = 0,
                  c2x = curr[1],
                  c2y = curr[2],
                  c2z = 0,
                  x = curr[3],
                  y = curr[4],
                  z = 0,
                  prevSeg = acc[idx-1],
                  cangoVer;

              // if prev segment was a cubic Bezier, mirror its last control point as cp1
              if (prevSeg[0] === "C")              {
                c1x = acc.px - prevSeg[prevSeg.length-4];   // relative coords of cp1
                c1y = acc.py - prevSeg[prevSeg.length-3];
              }
              // make cp1 absolute (all the curr coords are already absolute)
              c1x += acc.px;
              c1y += acc.py;
              cangoVer = ["C", c1x, c1y, c1z, c2x, c2y, c2z, x, y, z];  // Cubic Bezier
              acc.px = x;  // update the pen position for next command
              acc.py = y;
              acc.push(cangoVer);
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var c2x = curr[1],
                  c2y = curr[2],
                  x = curr[3],
                  y = curr[4];

              c2x += xOfs;
              c2y += yOfs;
              x += xOfs;
              y += yOfs;
              return ["S", c2x, c2y, x, y];    // invert y coords to make Cgo2D format
            },
            invertCoords: function(curr){
              var c2x = curr[1],
                  c2y = curr[2],
                  x = curr[3],
                  y = curr[4];

              return ["S", c2x, -c2y, x, -y];    // invert y coords to make Cgo2D format
            }
          },
          "Q": {         // Quadratic Bezier curve
            parmCount: 4,
            parmCount3D: 6,
            extCmd: "Q",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  c1x = curr[1],
                  c1y = curr[2],
                  x = curr[3],
                  y = curr[4],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                c1x += acc.px;
                c1y += acc.py;
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, c1x, c1y, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toAbs3D: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase command means absolute coords
                  c1x = curr[1],
                  c1y = curr[2],
                  c1z = curr[3],
                  x = curr[4],
                  y = curr[5],
                  z = curr[6],
                  currAbs;
              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                c1x += acc.px;
                c1y += acc.py;
                c1z += acc.pz;
                x += acc.px;
                y += acc.py;
                z += acc.pz;
              }
              currAbs = [cmd, c1x, c1y, c1z, x, y, z];
              acc.px = x;
              acc.py = y;
              acc.pz = z;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var cmd = curr[0],
                  c1x = curr[1],
                  c1y = curr[2],
                  c1z = 0,
                  x = curr[3],
                  y = curr[4],
                  z = 0;

              acc.px = x;  // update the pen position for next command
              acc.py = y;
              acc.push([cmd, c1x, c1y, c1z, x, y, z]); // push the curr, "Q" is a Cango internal command
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var c1x = curr[1],
                  c1y = curr[2],
                  x = curr[3],
                  y = curr[4];

              c1x += xOfs;
              c1y += yOfs;
              x += xOfs;
              y += yOfs;
              return ["Q", c1x, c1y, x, y];    // invert y coords to make Cgo2D format
            },
            invertCoords: function(curr){
              var c1x = curr[1],
                  c1y = curr[2],
                  x = curr[3],
                  y = curr[4];

              return ["Q", c1x, -c1y, x, -y];    // invert y coords to make Cgo2D format
            },
            toDrawCmd: function(curr){
              var c1x = curr[1],
                  c1y = curr[2],
                  c1z = curr[3],
                  x = curr[4],
                  y = curr[5],
                  z = curr[6],
                  cp1 = new Point(c1x, c1y, c1z),
                  cPts = [cp1],
                  ep = new Point(x, y, z);

              return new DrawCmd3D('quadraticCurveTo', cPts, ep);
            }
          },
          "T": {         // Smooth Quadratic Bezier curve
            parmCount: 2,
            extCmd: "T",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),  // uppercase means absolute coords
                  x = curr[1],
                  y = curr[2],
                  currAbs;

              // Check if 'curr' was a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr, idx) {
              var c1x = 0,    // relative coords of first (mirrored) control point
                  c1y = 0,
                  c1z = 0,
                  x = curr[1],
                  y = curr[2],
                  z = 0,
                  prevSeg = acc[idx-1],
                  cangoVer;

              // if prev segment was quadratic Bezier, mirror its last control point as cp1
              if (prevSeg[0] === "Q")            {
                c1x = acc.px - prevSeg[prevSeg.length-4];   // relative coords of first cp1
                c1y = acc.py - prevSeg[prevSeg.length-3];
              }
              // make cp1 absolute
              c1x += acc.px;
              c1y += acc.py;
              cangoVer = ["Q", c1x, c1y, c1z, x, y, z];   // Quadratic Bezier
              acc.px = x;  // update the pen position for next command
              acc.py = y;
              acc.push(cangoVer);
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var x = curr[1],
                  y = curr[2];

              x += xOfs;
              y += yOfs;
              return ["T", x, y];    // invert y coords to make Cgo2D format
            },
            invertCoords: function(curr){
              var x = curr[1],
                  y = curr[2];

              return ["T", x, -y];    // invert y coords to make Cgo2D format
            }
          },
          "A" : {      // Circular arc
            parmCount: 7,
            extCmd: "A",
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),
                  rx = curr[1],
                  ry = curr[2],
                  xrot = curr[3],     // opposite to SVG in Cartesian coords
                  lrg = curr[4],
                  swp = curr[5],      // opposite to SVG in Cartesian coords
                  x = curr[6],
                  y = curr[7],
                  currAbs;
              // Check if current is a relative (lowercase) command
              if (cmd !== curr[0]) {
                x += acc.px;
                y += acc.py;
              }
              currAbs = [cmd, rx, ry, xrot, lrg, swp, x, y];
              acc.px = x;
              acc.py = y;
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              var rx = curr[1],
                  ry = curr[2],
                  xrot = curr[3],     // opposite to SVG in Cartesian coords
                  lrg = curr[4],
                  swp = curr[5],      // opposite to SVG in Cartesian coords
                  x = curr[6],
                  y = curr[7],
                  sectors;

              // convert to (maybe multiple) cubic Bezier curves and add the z=0 coords
              sectors = arcToBezier(acc.px, acc.py, rx, ry, xrot, lrg, swp, x, y);
              // sectors is an array of arrays of Cubic Bezier coords,
              // make a 'C' command from each sector and push it out
              sectors.forEach(function(coordAry){
                acc.push(["C"].concat(coordAry));
              });

              acc.px = x;  // update the pen position for next command
              acc.py = y;
            },
            addXYoffset: function(curr, xOfs, yOfs){
              var rx = curr[1],
                  ry = curr[2],
                  xrot = curr[3],
                  lrg = curr[4],
                  swp = curr[5],
                  x = curr[6],
                  y = curr[7];

              x += xOfs;
              y += yOfs;
              return ["A", rx, ry, xrot, lrg, swp, x, y];  // invert y coords
            },
            invertCoords: function(curr){
              var rx = curr[1],
                  ry = curr[2],
                  xrot = curr[3],
                  lrg = curr[4],
                  swp = curr[5],
                  x = curr[6],
                  y = curr[7];

              return ["A", rx, ry, -xrot, lrg, 1-swp, x, -y];  // invert coords
            }
          },
          "Z": {
            parmCount: 0,
            parmCount3D: 0,
            toAbs: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),
                  currAbs = [cmd];
              // leave pen position where it is in case of multi-segment path
              return currAbs;
            },
            toAbs3D: function(acc, curr) {
              var cmd = curr[0].toUpperCase(),
                  currAbs = [cmd];
              // leave pen position where it is in case of multi-segment path
              return currAbs;
            },
            toCango3DVersion: function(acc, curr) {
              // leave pen position where it is in case of multi-segment path
              acc.push(curr); // push the curr, "Z", its a Cango internal command
            },
            addXYoffset: function(curr, xOfs, yOfs){
              return ["Z"];
            },
            invertCoords: function(curr){
              return ["Z"];
            },
            toDrawCmd: function(curr){
              return new DrawCmd3D("closePath");
            }
          }
        };
    // ========= end of vars =========

    /*==================================================
     * svgCmdCheck (a function for use with Array.reduce)
     * -------------------------------------------------
     * Checks each element, if a string it must be
     * one of the keys in the SVG protocol. If no bad
     * cmds found then the array is returned without
     * alteration, if not an empty array is returned.
     *=================================================*/
    function svgCmdCheck(acc, current, idx)
    {
      // make a concession to SVG standard and allow all number array
      if (idx === 0)
      {
        if (typeof current !== 'string')
        {
          acc.push("M");
          // now we will fall through to normal checking
        }
      }
      // if we see a command string, check it is in SVG protocol
      if (typeof current === "string") {  // check each string element
        if (!svgProtocol.hasOwnProperty(current.toUpperCase()))
        {
          console.log("unknown command string '"+current+"'");
          acc.badCmdFound = true;
          acc.length = 0;   // any bad command will force empty array to be returned
        }
      }
      if (!acc.badCmdFound)
      {
        acc.push(current);
      }
      // always return when using reduce...
      return acc;
    }

    /*==================================================
     * Cgo3DCmdCheck (a function for use with Array.reduce)
     * -------------------------------------------------
     * Checks each array element, if its a string it must be
     * one of the cmd letters in the Cgo3D protocol. If no bad
     * cmds found then the array is returned without
     * alteration, if not an empty array is returned.
     *=================================================*/
    function Cgo3DCmdCheck(acc, current, idx)
    {
      var cgo3Dcmds = ["M", "L", "C", "Q", "Z"];

      // make a concession to SVG standard and allow all number array
      if (idx === 0)
      {
        if (typeof current !== 'string')
        {
          acc.push("M");
          // now we will fall through to normal checking
        }
      }
      // if we see a command string, check it is in SVG protocol
      if (typeof current === "string") {  // check each string element
        if (cgo3Dcmds.indexOf(current.toUpperCase()) === -1)
        {
          console.log("unknown command string '"+current+"'");
          acc.badCmdFound = true;
          acc.length = 0;   // any bad command will force empty array to be returned
        }
      }
      if (!acc.badCmdFound)
      {
        acc.push(current);
      }
      // always return when using reduce...
      return acc;
    }

    /*======================================================
     * unExtend  (a function for use with Array.reduce)
     * -----------------------------------------------------
     * Undo the extension of commands allowed in the svg protocol.
     * Each entry in the protocol has an extCmd property which
     * is usually the same as the command key but for "M"
     * which may be extended by a series of "L" commands.
     * Extending a command means that multiple sets of paramaeters
     * may follow a command letter without the need to repeat
     * the command letter in front of each set eg.
     * var a = ['M', 1, 2, 'L', 3, 4, 5, 6, 7, 8, 'A', 5, 6, 7, 8, 3, 0, 2]
     * var b = a.reduce(unExtend, [])
     * >> ['M', 1, 2, 'L', 3, 4, 'L', 5, 6, 'L', 7, 8, 'A', 5, 6, 7, 8, 3, 0, 2]
     *
     * The 'reduce' accumulator is used to hold the current
     * command as a property (not an array element) and make it
     * available to the next element.
     *
     * This assumes no invalid commands are in the string -
     * so array should be sanitized before running unExtend
     *======================================================*/
    function unExtend(acc, current, idx, ary)
    {
      var newCmd;

      if (idx === 0)
      {
        acc.nextCmdPos = 0;  // set expected position of next command string as first element
      }
      // Check if current is a command in the protocol (protocol only indexed by upperCase)
      if (typeof current === 'string')
      {
        if (idx < acc.nextCmdPos)
        {
          // we need another number but found a string
          console.log("bad number of parameters for '"+current+"' at index "+idx);
          acc.badParameter = true;  // raise flag to bailout processing this
          acc.push(0);  // try to get out without crashing (acc data will be ditched any way)
          return acc;
        }
        // its a command the protocol knows, remember it across iterations of elements
        acc.currCmd = current.toUpperCase();  // save as a property of the acc Array object (not an Array element)
        acc.uc = (current.toUpperCase() === current);  // upperCase? true or false
        // calculate where the next command should be
        acc.nextCmdPos = idx + svgProtocol[acc.currCmd].parmCount + 1;
        acc.push(current);
      }
      else if (idx < acc.nextCmdPos)   // processing parameters
      {
        // keep shoving parameters
        acc.push(current);
      }
      else
      {
        // we have got a full set of parameters but hit another number
        // instead of a command string, it must be a command extension
        // push a the extension command (same as current except for M which extend to L)
        // into the accumulator
        acc.currCmd = svgProtocol[acc.currCmd].extCmd;  // NB: don't change the acc.uc boolean
        newCmd = (acc.uc)? acc.currCmd: acc.currCmd.toLowerCase();
        acc.push(newCmd, current);
        // calculate where the next command should be
        acc.nextCmdPos = idx + svgProtocol[acc.currCmd].parmCount;
      }

      if (idx === ary.length-1)   // done processing check if all was ok
      {
        if (acc.badParameter)
        {
          acc.length = 0;
        }
      }
      // always return when using reduce...
      return acc;
    }

    /*=================================================================
     * unExtend3D  (a function for use with Array.reduce)
     * ----------------------------------------------------------------
     * Undo the extension of commands given the svg protocol.
     * see description of 'unExtend above.
     * This version expects 3D coordinates eg.
     *
     * var a = ['M', 1, 2, 0, 'L', 3, 4, 0, 5, 6, 0, 7, 8, 0, 'Z']
     * var b = a.reduce(unExtend3D, [])
     *
     * >> ['M', 1, 2, 0, 'L', 3, 4, 0, 'L', 5, 6, 0, 'L', 7, 8, 0, 'Z']
     *
     * This assumes no invalid commands are in the string -
     * so array should be sanitized before running unExtend3D
     *=================================================================*/
    function unExtend3D(acc, current, idx, ary)
    {
      var newCmd;

      if (idx === 0)
      {
        acc.nextCmdPos = 0;  // set expected position of next command string as first element
      }
      // Check if current is a command in the protocol (protocol only indexed by upperCase)
      if (typeof current === 'string')
      {
        if (idx < acc.nextCmdPos)
        {
          // we need another number but found a string
          console.log("bad number of parameters for '"+current+"' at index "+idx);
          acc.badParameter = true;  // raise flag to bailout processing this
          acc.push(0);  // try to get out without crashing (acc data will be ditched any way)
          return acc;
        }
        // its a command the protocol knows, remember it across iterations of elements
        acc.currCmd = current.toUpperCase();  // save as a property of the acc Array object (not an Array element)
        acc.uc = (current.toUpperCase() === current);  // upperCase? true or false
        // calculate where the next command should be
        acc.nextCmdPos = idx + svgProtocol[acc.currCmd].parmCount3D + 1;
        acc.push(current);
      }
      else if (idx < acc.nextCmdPos)   // processing parameters
      {
        // keep shoving parameters
        acc.push(current);
      }
      else
      {
        // we have got a full set of parameters but hit another number
        // instead of a command string, it must be a command extension
        // push a the extension command (same as current except for M which extend to L)
        // into the accumulator
        acc.currCmd = svgProtocol[acc.currCmd].extCmd;  // NB: don't change the acc.uc boolean
        newCmd = (acc.uc)? acc.currCmd: acc.currCmd.toLowerCase();
        acc.push(newCmd, current);
        // calculate where the next command should be
        acc.nextCmdPos = idx + svgProtocol[acc.currCmd].parmCount3D;
      }

      if (idx === ary.length-1)   // done processing check if all was ok
      {
        if (acc.badParameter)
        {
          acc.length = 0;
        }
      }
      // always return when using reduce...
      return acc;
    }

    /*=======================================================
     * svgCmdSplitter (a function for use with Array.reduce)
     * ------------------------------------------------------
     * Split an array on a string type element, e.g.
     *
     * var a = ['a', 1, 2, 'b', 3, 4, 'c', 5, 6, 7, 8]
     * var b = a.reduce(svgCmdSplitter, [])
     *
     * >> [['a', 1, 2],['b', 3, 4], ['c', 5, 6, 7, 8]]
     *
     *======================================================*/
    function svgCmdSplitter(acc, curr)
    {
      // if we see a command string, start a new array element
      if (typeof curr === "string") {
          acc.push([]);
      }
      // add this element to the back of the acc's last array
      acc[acc.length-1].push(curr);
      // always return when using reduce...
      return acc;
    }

    /*===========================================================
     * toAbsoluteCoords  (a function for use with Array.reduce)
     * ----------------------------------------------------------
     * Reduce is needed even though the same size elements are
     * returned because the accumulator is used to hold the pen
     * x,y coords and make them available to the next element.
     * Assumes 'current' argument is an array of form ["M", 2, 7]
     * if command letter is lower case the protocol.toAbs
     * function will add the current pen x and y values to
     * the coordinates and update the pen x, y. The
     * absolute coord version of the cmd and its coords will
     * be returned and then pushed into acc.
     *
     * eg. ['M', 1, 2, 'l', 3, 4, 'a', 5, 6, 7, 8, 3, 0, 2, 'z']
     * >>  ['M', 1, 2, 'L', 4, 6, 'A', 5, 6, 7, 8, 3, 4, 8, 'Z']
     *===========================================================*/
    function toAbsoluteCoords(acc, current, idx)
    {
      var currCmd, currAbs;

      if (acc.px === undefined)
      {
        acc.px = 0;
        acc.py = 0;
      }
      // get protocol object for this command, indexed by uppercase only
      currCmd = svgProtocol[current[0].toUpperCase()];
      // call protocol toAbs function for this command
      // it returns absolute coordinate version based on current
      // pen position stored in acc.px, acc.py
      currAbs = currCmd.toAbs(acc, current, idx);
      acc.push(currAbs);
      // always return when using reduce...
      return acc;
    }

    /*====================================================================
     * toAbsoluteCoords3D  (a function for use with Array.reduce)
     * -------------------------------------------------------------------
     * Version of the toAbsoluteCoords but expecting 3D coordinates
     * eg. ['M', 1, 2, 0, 'l', 3, 4, 1, 'm', 5, 6, 7, 'l', 8, 3, 0, 'z']
     * >>  ['M', 1, 2, 0, 'L', 4, 6, 1, 'M', 5, 6, 7, 'L', 13, 9, 7, 'Z']
     *====================================================================*/
    function toAbsoluteCoords3D(acc, current, idx)
    {
      var currCmd, currAbs;

      if (acc.px === undefined)
      {
        acc.px = 0;
        acc.py = 0;
        acc.pz = 0;
      }
      // get protocol object for this command, indexed by uppercase only
      currCmd = svgProtocol[current[0].toUpperCase()];
      // call protocol toAbs3D function for this command
      // it returns absolute coordinate version based on current
      // pen position stored in acc.px, acc.py, acc.pz
      currAbs = currCmd.toAbs3D(acc, current, idx);
      acc.push(currAbs);
      // always return when using reduce...
      return acc;
    }

    /*=================================================================================================
     * toCango3DCmdSet  (a function for use with Array.reduce)
     * ------------------------------------------------------------------------------------------------
     * Assumes 'current' argument is an array with one Cgo2D command in format ["M", 2, 7]
     * All commands letters are uppercase and all coordinates are absolute (referenced to world
     * coordinate origin).
     * This function will convert "H", "V", "S", "T", and "A"
     * commands to Cango internal command set "M", "L", "Q", "C", "Z"
     * All coordinates will be returned in separate array
     *
     * eg. [['M', 1, 2], ['L', 3, 4], ['H', 3], ['A', 5, 6, 7, 8, 3, 0, 2], ['Z']]
     * >>  [['M', 1, 2, 0], ['L', 3, 4, 0], ['L', 3, 4, 0], ['C', cp, cp, 0, cp, cp, 0, x, y, ], ['Z']]
     *=================================================================================================*/
    function toCango3DCmdSet(acc, current, idx)
    {
      var currSvgObj = svgProtocol[current[0].toUpperCase()];
      // call protocol toCango3DVersion function for this command
      // it converts all SVG to just "M", "L", "Q", "C", "Z" command and coords
      // adds a z=0 coord and pushes them into the acc
      currSvgObj.toCango3DVersion(acc, current, idx);
      // always return when using reduce...
      return acc;
    }

    /*===============================================================================
     * toDrawCmds3D  (a function for use with Array.reduce)
     * ------------------------------------------------------------------------------
     * Convert a Cgo3D data array to an array
     * of Cango DrawCmd objects e.g.
     *
     * [['M', 0.1, 0.2, 0], ['L', 1, 2, 0], ['C', 3, 4, 5, 6, 2, 9, 0, 1, 2], ['Z']]
     *
     * will become
     * [{ drawFn: "moveTo",
     *    cPts: [cp1, cp2],   // cp1, cp2 are Point objects
     *    ep: eP              // Point object
     *  },
     *  { drawFn: "lineTo",
     *    cPts: [cp1, cp2],
     *    ep: eP
     *  },
     *  ...
     *  ]
     *
     *===============================================================================*/
    function toDrawCmd3D(acc, current)
    {
      // call protocol toDrawCmd function for this command
      // it returns a DrawCmd3D object made from the current cmd and parms
      var currCmd = svgProtocol[current[0].toUpperCase()],
          currDC = currCmd.toDrawCmd(current);

      if (currDC !== null)
      {
        acc.push(currDC);
      }
      // always return when using reduce...
      return acc;
    }

    /*==================================================
     * strToCgo2D (a function for use with Array.reduce)
     * -------------------------------------------------
     * Assumes 'current' argument is a string of form
     * "M  2 7" or "v 7  " or "z" which always has a
     * command string as the first character
     * and the rest is numbers separated by white space
     * This function will reduce (combine) to a single
     * array in Cgo2D format ["M", 2, 7, "v", 7, "z"]
     *=================================================*/
    function strToCgo2D(acc, current)
    {
      var cmd = current[0],
          parmsStr, numberStrs;

      // push the single char command as an element
      acc.push(cmd);
      // strip off the front cmd
      parmsStr = current.slice(1);
      // convert to an array of strings, each one a number
      numberStrs = parmsStr.match(/\S+/g);   // returns null if no matches (not empty array)
      if (numberStrs)      // z has no numbers to follow
      {
        // parse each to a float and push it into acc
        numberStrs.forEach(function(s){
          var num = parseFloat(s);
          if (!isNaN(num))
          {
            acc.push(num);
          }
        });
      }
      // always return when using reduce...
      return acc;
    }

    /*===========================================================
     * flipCoords  (a function for use with Array.map)
     * ----------------------------------------------------------
     * Assumes 'current' argument is an array of form ["M", 2, 7]
     * All coordinates will be be in absolute format
     * The protocol will have an 'invertCoords' method for each
     * possible command key this will return the current array
     * with the sign of the Y coords flipped and sense of arcs
     * reversed
     *
     * current = ['A', 2, 2,  30, 0, 1, 3,  4]
     *       >>  ['A', 2, 2, -30, 0, 0, 3, -4]
     *===========================================================*/
    function flipCoords(current)
    {
      var currCmd = current[0],
          currSvgObj = svgProtocol[currCmd];

      // call protocol.invertCoords function for this command
      // it flips the sign of the y coords, for 'A' commands it flips
      // sweep and xRotation values and returns the modified array
      return currSvgObj.invertCoords(current);
    }

    /*===========================================================
     * translateOrigin  (a function for use with Array.map)
     * ----------------------------------------------------------
     * Assumes it is called with 'this' object having
     * properties {xOfs: value, yOfs: value}
     * Assumes 'current' argument is an array of form ["M", 2, 7]
     * All coordinates will be be in absolute format
     * The protocol will have an 'addXYoffset method for each
     * possible command key this will return the current array
     * with the X and Y offsets added to the coordinate elements.
     *
     * eg. if 'this = {xOfs: 100, yOfs: 10}
     * current = ['M', 1, 2]
     * >>  ['M', 101, 12]
     *===========================================================*/
    function translateOrigin(current)
    {
      var currCmd = current[0],
          currSvgObj = svgProtocol[currCmd],
          xofs = this.xOfs || 0,
          yofs = this.yOfs || 0;

      return currSvgObj.addXYoffset(current, xofs, yofs);
    }

    /*===========================================================
     * flatten2Dary  (a function for use with Array.reduce)
     * ----------------------------------------------------------
     * Assumes curr is an array, push each element into the acc
     * to form a 1D array.

     * eg. [[a, b, c], [d, e],[f]]
     * >>  [a, b, c, d, e, f]
     *===========================================================*/
    function flatten2Dary(acc, curr){
      return acc.concat(curr);
    }

    // auto run this code to create this object holding the two translator fns
    // and return it as the svgParser
    return {
      svg2cgo3D: function(data2D, xShft, yShft) {
        // svgtoCgo3D can handle an SVG format string or a Cgo2D array
        var dx = xShft || 0,
            dy = yShft || 0,
            noCommas,
            cmdStrs;

        if (typeof data2D === 'string')
        {
          // this SVG processor can handle comma separated or whitespace separated or mixed
          // replace any commas with spaces
          noCommas = data2D.replace(new RegExp(',', 'g'), ' ');
          // now we have a string of commands and numbers separated by whitespace
          // split it at command chars
          cmdStrs = noCommas.split(/(?=[a-df-z])/i);  // avoid e in exponents
          // now convert to Cgo3D format
          return cmdStrs.reduce(strToCgo2D, [])
                        .reduce(svgCmdCheck, [])
                        .reduce(unExtend, [])
                        .reduce(svgCmdSplitter, [])
                        .reduce(toAbsoluteCoords, [])
                        .map(translateOrigin, {xOfs: dx, yOfs: dy})
                        .map(flipCoords)
                        .reduce(toCango3DCmdSet, [])   // to 3D coords
                        .reduce(flatten2Dary, []);     // return valid Cgo3D array
        }
        else if (!isArray(data2D))
        {
          return [];
        }
        else  // treat this as a cgo2D array
        {
          return data2D.reduce(svgCmdCheck, [])
                       .reduce(unExtend, [])
                       .reduce(svgCmdSplitter, [])
                       .reduce(toAbsoluteCoords, [])
                       .reduce(toCango3DCmdSet, [])      // to 3D coords
                       .reduce(flatten2Dary, []);        // return valid Cgo3D array
        }
      },
      cgo3DtoDrawcmd: function(cgo3Dary) {
        if (!isArray(cgo3Dary) || (cgo3Dary.length === 0))
        {
          return [];
        }

        return cgo3Dary.reduce(Cgo3DCmdCheck, [])
                       .reduce(unExtend3D, [])
                       .reduce(svgCmdSplitter, [])
                       .reduce(toAbsoluteCoords3D, [])
                       .reduce(toDrawCmd3D, []);
      }
    };

  }());

  if (shapes3D === undefined)
  {
    shapes3D = {'circle': function(diameter){
                            var d = diameter || 1;
                            return ["m", -0.5*d,0,0,
                            "c", 0,-0.27614*d,0, 0.22386*d,-0.5*d,0, 0.5*d,-0.5*d,0,
                            "c", 0.27614*d,0,0, 0.5*d,0.22386*d,0, 0.5*d,0.5*d,0,
                            "c", 0,0.27614*d,0, -0.22386*d,0.5*d,0, -0.5*d,0.5*d,0,
                            "c", -0.27614*d,0,0, -0.5*d,-0.22386*d,0, -0.5*d,-0.5*d,0];},

                'ellipse': function(width, height){
                            var w = width || 1,
                                h = w;
                            if ((typeof height === 'number')&&(height>0))
                            {
                              h = height;
                            }
                            return ["m", -0.5*w,0,0,
                            "c", 0,-0.27614*h,0, 0.22386*w,-0.5*h,0, 0.5*w,-0.5*h,0,
                            "c", 0.27614*w,0,0, 0.5*w,0.22386*h,0, 0.5*w,0.5*h,0,
                            "c", 0,0.27614*h,0, -0.22386*w,0.5*h,0, -0.5*w,0.5*h,0,
                            "c", -0.27614*w,0,0, -0.5*w,-0.22386*h,0, -0.5*w,-0.5*h,0];},

                'square': function(width){
                            var w = width || 1;
                            return ['m', 0.5*w,-0.5*w,0, 'l',0,w,0, -w,0,0, 0,-w,0, 'z'];},

                'triangle': function(side){
                            var s = side || 1;
                            return ['m',0.5*s,-0.289*s,0, 'l',-0.5*s,0.866*s,0, -0.5*s,-0.866*s,0, 'z'];},

                'cross': function(width){
                            var w = width || 1;
                            return ['m',-0.5*w,0,0, 'l',w,0,0, 'm',-0.5*w,-0.5*w,0, 'l',0,w,0];},

                'ex': function(diagonal){
                            var d = diagonal || 1;
                            return ['m',-0.3535*d,-0.3535*d,0, 'l',0.707*d,0.707*d,0,
                                    'm',-0.707*d,0,0, 'l',0.707*d,-0.707*d,0];}
                };
  }

  /**
   * A class to parse color values
   * @author Stoyan Stefanov <sstoo@gmail.com>
   * @link   http://www.phpied.com/rgb-color-parser-in-javascript/
   * @license Use it if you like it
   *
   * supplemented to handle rgba format (alpha 0 .. 1.0)  by arc 04SEP09
   */
  function RGBAColor(color_string)
  {
    var simple_colors = {
        aliceblue: 'f0f8ff',
        antiquewhite: 'faebd7',
        aqua: '00ffff',
        aquamarine: '7fffd4',
        azure: 'f0ffff',
        beige: 'f5f5dc',
        bisque: 'ffe4c4',
        black: '000000',
        blanchedalmond: 'ffebcd',
        blue: '0000ff',
        blueviolet: '8a2be2',
        brown: 'a52a2a',
        burlywood: 'deb887',
        cadetblue: '5f9ea0',
        chartreuse: '7fff00',
        chocolate: 'd2691e',
        coral: 'ff7f50',
        cornflowerblue: '6495ed',
        cornsilk: 'fff8dc',
        crimson: 'dc143c',
        cyan: '00ffff',
        darkblue: '00008b',
        darkcyan: '008b8b',
        darkgoldenrod: 'b8860b',
        darkgray: 'a9a9a9',
        darkgreen: '006400',
        darkkhaki: 'bdb76b',
        darkmagenta: '8b008b',
        darkolivegreen: '556b2f',
        darkorange: 'ff8c00',
        darkorchid: '9932cc',
        darkred: '8b0000',
        darksalmon: 'e9967a',
        darkseagreen: '8fbc8f',
        darkslateblue: '483d8b',
        darkslategray: '2f4f4f',
        darkturquoise: '00ced1',
        darkviolet: '9400d3',
        deeppink: 'ff1493',
        deepskyblue: '00bfff',
        dimgray: '696969',
        dodgerblue: '1e90ff',
        feldspar: 'd19275',
        firebrick: 'b22222',
        floralwhite: 'fffaf0',
        forestgreen: '228b22',
        fuchsia: 'ff00ff',
        gainsboro: 'dcdcdc',
        ghostwhite: 'f8f8ff',
        gold: 'ffd700',
        goldenrod: 'daa520',
        gray: '808080',
        green: '008000',
        greenyellow: 'adff2f',
        honeydew: 'f0fff0',
        hotpink: 'ff69b4',
        indianred : 'cd5c5c',
        indigo : '4b0082',
        ivory: 'fffff0',
        khaki: 'f0e68c',
        lavender: 'e6e6fa',
        lavenderblush: 'fff0f5',
        lawngreen: '7cfc00',
        lemonchiffon: 'fffacd',
        lightblue: 'add8e6',
        lightcoral: 'f08080',
        lightcyan: 'e0ffff',
        lightgoldenrodyellow: 'fafad2',
        lightgrey: 'd3d3d3',
        lightgreen: '90ee90',
        lightpink: 'ffb6c1',
        lightsalmon: 'ffa07a',
        lightseagreen: '20b2aa',
        lightskyblue: '87cefa',
        lightslateblue: '8470ff',
        lightslategray: '778899',
        lightsteelblue: 'b0c4de',
        lightyellow: 'ffffe0',
        lime: '00ff00',
        limegreen: '32cd32',
        linen: 'faf0e6',
        magenta: 'ff00ff',
        maroon: '800000',
        mediumaquamarine: '66cdaa',
        mediumblue: '0000cd',
        mediumorchid: 'ba55d3',
        mediumpurple: '9370d8',
        mediumseagreen: '3cb371',
        mediumslateblue: '7b68ee',
        mediumspringgreen: '00fa9a',
        mediumturquoise: '48d1cc',
        mediumvioletred: 'c71585',
        midnightblue: '191970',
        mintcream: 'f5fffa',
        mistyrose: 'ffe4e1',
        moccasin: 'ffe4b5',
        navajowhite: 'ffdead',
        navy: '000080',
        oldlace: 'fdf5e6',
        olive: '808000',
        olivedrab: '6b8e23',
        orange: 'ffa500',
        orangered: 'ff4500',
        orchid: 'da70d6',
        palegoldenrod: 'eee8aa',
        palegreen: '98fb98',
        paleturquoise: 'afeeee',
        palevioletred: 'd87093',
        papayawhip: 'ffefd5',
        peachpuff: 'ffdab9',
        peru: 'cd853f',
        pink: 'ffc0cb',
        plum: 'dda0dd',
        powderblue: 'b0e0e6',
        purple: '800080',
        red: 'ff0000',
        rosybrown: 'bc8f8f',
        royalblue: '4169e1',
        saddlebrown: '8b4513',
        salmon: 'fa8072',
        sandybrown: 'f4a460',
        seagreen: '2e8b57',
        seashell: 'fff5ee',
        sienna: 'a0522d',
        silver: 'c0c0c0',
        skyblue: '87ceeb',
        slateblue: '6a5acd',
        slategray: '708090',
        snow: 'fffafa',
        springgreen: '00ff7f',
        steelblue: '4682b4',
        tan: 'd2b48c',
        teal: '008080',
        thistle: 'd8bfd8',
        tomato: 'ff6347',
        transparent: 'rgba(0,0,0,0)',
        turquoise: '40e0d0',
        violet: 'ee82ee',
        violetred: 'd02090',
        wheat: 'f5deb3',
        white: 'ffffff',
        whitesmoke: 'f5f5f5',
        yellow: 'ffff00',
        yellowgreen: '9acd32'
    };
    // array of color definition objects
    var color_defs = [
      {
        re: /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*((1(\.0)?)|0?(\.\d*)?)\)$/,
        example: ['rgba(123, 234, 45, 0.5)', 'rgba(255,234,245,1)'],
        process: function (bits){
            return [
                parseInt(bits[1], 10),
                parseInt(bits[2], 10),
                parseInt(bits[3], 10),
                parseFloat(bits[4], 10)
            ];
        }
      },
      {
        re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
        example: ['rgb(123, 234, 45)', 'rgb(255,234,245)'],
        process: function (bits){
            return [
                parseInt(bits[1], 10),
                parseInt(bits[2], 10),
                parseInt(bits[3], 10)
            ];
        }
      },
      {
        re: /^(\w{2})(\w{2})(\w{2})$/,
        example: ['#00ff00', '336699'],
        process: function (bits){
            return [
                parseInt(bits[1], 16),
                parseInt(bits[2], 16),
                parseInt(bits[3], 16)
            ];
        }
      },
      {
        re: /^(\w{1})(\w{1})(\w{1})$/,
        example: ['#fb0', 'f0f'],
        process: function (bits){
            return [
                parseInt(bits[1] + bits[1], 16),
                parseInt(bits[2] + bits[2], 16),
                parseInt(bits[3] + bits[3], 16)
            ];
        }
      }
    ];

    var i,
        re,
        processor,
        bits,
        channels,
        key;

    this.ok = false;
    if (typeof color_string !== "string")       // bugfix: crashed if passed a number
    {
      return;
    }
    // strip any leading #
    if (color_string.charAt(0) === '#')
    { // remove # if any
      color_string = color_string.substr(1,6);
    }

    color_string = color_string.replace(/ /g,'');
    color_string = color_string.toLowerCase();

    // before getting into regexps, try simple matches
    // and overwrite the input
    for (key in simple_colors)
    {
      if (color_string === key)
      {
        color_string = simple_colors[key];
      }
    }

    // search through the definitions to find a match
    for (i=0; i<color_defs.length; i++)
    {
      re = color_defs[i].re;
      processor = color_defs[i].process;
      bits = re.exec(color_string);
      if (bits)
      {
        channels = processor(bits);    // bugfix: was global. [ARC 17Jul12]
        this.r = channels[0];
        this.g = channels[1];
        this.b = channels[2];
        if (bits.length>3)
        {
          this.a = channels[3];
        }
        else
        {
          this.a = 1.0;
        }
        this.ok = true;
      }
    }

    // validate/cleanup values
    this.r = (this.r < 0 || isNaN(this.r)) ? 0 : ((this.r > 255) ? 255 : this.r);
    this.g = (this.g < 0 || isNaN(this.g)) ? 0 : ((this.g > 255) ? 255 : this.g);
    this.b = (this.b < 0 || isNaN(this.b)) ? 0 : ((this.b > 255) ? 255 : this.b);
    this.a = (this.a < 0 || isNaN(this.a)) ? 1.0 : ((this.a > 1) ? 1.0 : this.a);

    // some getters
    this.toRGBA = function()
    {
      return 'rgba(' + this.r + ', ' + this.g + ', '  + this.b + ', ' + this.a + ')';
    };
    this.toRGB = function()
    {
      return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
    };
    this.toHex = function()
    {
      var r = this.r.toString(16),
          g = this.g.toString(16),
          b = this.b.toString(16);
      if (r.length === 1)
      {
        r = '0' + r;
      }
      if (g.length === 1)
      {
        g = '0' + g;
      }
      if (b.length === 1)
      {
        b = '0' + b;
      }
      return '#' + r + g + b;
    };
  }

  function Drag3D(grabFn, dragFn, dropFn)
  {
    var savThis = this;

    this.cgo = null;      // filled in by render
    this.target = null;   // the Obj3D or Group3D that is to be dragged, filled by enableDrag method
    this.parent = null;   // the Obj3D that got the mouse down event on it, filled in at grab
    this.grabCallback = grabFn || null;
    this.dragCallback = dragFn || null;
    this.dropCallback = dropFn || null;
    this.grabCsrPos = {x:0, y:0, z:0};
    this.dwgOrg = {x:0, y:0, z:0};   // target's drawing origin in world coords
    this.dwgOrgOfs = {x:0, y:0, z:0};// target's dwgOrg offset from its parent Group3D's dwgOrg
    this.grabOfs = {x:0, y:0, z:0};  // csr offset from (relative) target dwgOrg, ie csrPos - dwgOrgOfs

    // these closures are called in the scope of the Drag3D instance so 'this' is valid
    this.grab = function(evt, grabbedObj)
    {
      var event = evt||window.event,
          csrPosWC;
      // this Drag3D may be attached to an Obj3D's Group3D parent
      if (grabbedObj.dragNdrop !== null)
      {
        this.parent = grabbedObj;      // the target is an Obj3D
      }
      else  // cant find the dragNdrop for this grab
      {
        return true;
      }

      this.cgo.cnvs.onmouseup = function(e){savThis.drop(e);};
      this.cgo.cnvs.onmouseout = function(e){savThis.drop(e);};
      csrPosWC = this.cgo.getCursorPosWC(event);  // world coords version of cursor position
      // save the cursor pos its very useful
      this.grabCsrPos.x = csrPosWC.x;
      this.grabCsrPos.y = csrPosWC.y;
      this.grabCsrPos.z = 0;
      // save the targets drawing origin (world coords)
      this.dwgOrg = {x:this.target.dwgOrg.tx,  // absolute coords, gets parent group dwgOrg added at render
                     y:this.target.dwgOrg.ty,
                     z:this.target.dwgOrg.tz};
      // save target's dwgOrg offset from its parent - this is what dragging will change
      // the world coords of the parent group are added back on by render
      if (this.target.parent)
      {
        this.dwgOrgOfs = {x:this.target.dwgOrg.tx - this.target.parent.dwgOrg.tx,
                          y:this.target.dwgOrg.ty - this.target.parent.dwgOrg.ty,
                          z:this.target.dwgOrg.tz - this.target.parent.dwgOrg.tz};
      }
      else
      {
        // no parent, so same as adding 0s
        this.dwgOrgOfs = {x:this.target.dwgOrg.tx,
                          y:this.target.dwgOrg.ty,
                          z:this.target.dwgOrg.tz};
      }

      // save the cursor offset from the target drawing origin (relative to parent) for convenience
      // subtracting this from dragged cursor pos gives the distance the target should be moved
      this.grabOfs = {x:csrPosWC.x - this.dwgOrgOfs.x,
                      y:csrPosWC.y - this.dwgOrgOfs.y,
                      z:csrPosWC.z - this.dwgOrgOfs.z};

      if (this.grabCallback)
      {
        this.grabCallback(csrPosWC);    // call in the scope of dragNdrop object
      }

      this.cgo.cnvs.onmousemove = function(event){savThis.drag(event);};
      if (event.preventDefault)       // prevent default browser action (W3C)
      {
        event.preventDefault();
      }
      else                        // shortcut for stopping the browser action in IE
      {
        window.event.returnValue = false;
      }
      return false;
    };

    this.drag = function(event)
    {
      var csrPosWC = this.cgo.getCursorPosWC(event);
      if (this.dragCallback)
      {
        this.dragCallback(csrPosWC);
      }

      return false;
    };

    this.drop = function(event)
    {
      var csrPosWC = this.cgo.getCursorPosWC(event);
      this.cgo.cnvs.onmouseup = null;
      this.cgo.cnvs.onmousemove = null;
      if (this.dropCallback)
      {
        this.dropCallback(csrPosWC);
      }
    };

    // version of drop that can be called from an app to stop a drag before the mouseup event
    this.cancelDrag = function(mousePos)
    {
      this.cgo.cnvs.onmouseup = null;
      this.cgo.cnvs.onmouseout = null;
      this.cgo.cnvs.onmousemove = null;
      if (this.dropCallback)
      {
        this.dropCallback(mousePos);
      }
    };
  }

  // Generate a 3D translation matrix
  function translateMatrix(tx, ty, tz)
  {
    var x = tx || 0,
        y = ty || 0,
        z = tz || 0;

    return [ [1, 0, 0, 0],
             [0, 1, 0, 0],
             [0, 0, 1, 0],
             [x, y, z, 1] ];
  }

  // Generate a 3D rotate matrix, angle in degrees
  function rotateMatrix(vx, vy, vz, deg)
  {
    var angle = deg || 0,
        t = Math.PI/180.0,
        mag = Math.sqrt(vx*vx + vy*vy + vz*vz),   // calc vector length
        x	= vx/mag,
        y	= vy/mag,
        z	= vz/mag,
        s	= Math.sin(-angle*t),
        c	= Math.cos(-angle*t),
        C	= 1-c;
        // ref: http://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
    return [[  (x*x*C+c), (y*x*C-z*s), (z*x*C+y*s), 0],
            [(x*y*C+z*s),   (y*y*C+c), (z*y*C-x*s), 0],
            [(x*z*C-y*s), (y*z*C+x*s),   (z*z*C+c), 0],
            [          0,           0,           0, 1]];
  }

  // Generate a 3D scale matrix
  function scaleMatrix(scale)
  {
    var s = scale || 1,
        as = Math.abs(s);


    return [ [as, 0,  0, 0],
             [0, as,  0, 0],
             [0,  0, as, 0],
             [0,  0,  0, 1]];
  }

  /* ===============================================
   * Object holding an array of 4 1x4 arrays,
   * representing a 4x4 matrix
   * -----------------------------------------------
   */
  function TransformMatrix(matrixAry)
  {
    if (isArray(matrixAry))
    {
      this.matrix = matrixAry;
    }
    else
    {
      this.matrix = [ [1, 0, 0, 0],
                      [0, 1, 0, 0],
                      [0, 0, 1, 0],
                      [0, 0, 0, 1] ];
    }
  }

  TransformMatrix.prototype.reset = function()
  {
    this.matrix[0][0] = 1;
    this.matrix[0][1] = 0;
    this.matrix[0][2] = 0;
    this.matrix[0][3] = 0;
    this.matrix[1][0] = 0;
    this.matrix[1][1] = 1;
    this.matrix[1][2] = 0;
    this.matrix[1][3] = 0;
    this.matrix[2][0] = 0;
    this.matrix[2][1] = 0;
    this.matrix[2][2] = 1;
    this.matrix[2][3] = 0;
    this.matrix[3][0] = 0;
    this.matrix[3][1] = 0;
    this.matrix[3][2] = 0;
    this.matrix[3][3] = 1;
  };

  TransformMatrix.prototype.applyTransform = function(m)
  {
    // apply a transform by multiplying this.matrix by matrix 'm'
    var a11 = this.matrix[0][0],
        a12 = this.matrix[0][1],
        a13 = this.matrix[0][2],
        a14 = this.matrix[0][3],
        a21 = this.matrix[1][0],
        a22 = this.matrix[1][1],
        a23 = this.matrix[1][2],
        a24 = this.matrix[1][3],
        a31 = this.matrix[2][0],
        a32 = this.matrix[2][1],
        a33 = this.matrix[2][2],
        a34 = this.matrix[2][3],
        a41 = this.matrix[3][0],
        a42 = this.matrix[3][1],
        a43 = this.matrix[3][2],
        a44 = this.matrix[3][3],
        b11 = m[0][0],
        b12 = m[0][1],
        b13 = m[0][2],
        b14 = m[0][3],
        b21 = m[1][0],
        b22 = m[1][1],
        b23 = m[1][2],
        b24 = m[1][3],
        b31 = m[2][0],
        b32 = m[2][1],
        b33 = m[2][2],
        b34 = m[2][3],
        b41 = m[3][0],
        b42 = m[3][1],
        b43 = m[3][2],
        b44 = m[3][3];

    this.matrix[0][0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    this.matrix[0][1] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    this.matrix[0][2] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    this.matrix[0][3] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    this.matrix[1][0] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    this.matrix[1][1] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    this.matrix[1][2] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    this.matrix[1][3] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    this.matrix[2][0] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    this.matrix[2][1] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    this.matrix[2][2] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    this.matrix[2][3] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    this.matrix[3][0] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    this.matrix[3][1] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    this.matrix[3][2] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    this.matrix[3][3] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  };

  function matrixMult(a, b)
  {
    var a11 = a[0][0],
        a12 = a[0][1],
        a13 = a[0][2],
        a14 = a[0][3],
        a21 = a[1][0],
        a22 = a[1][1],
        a23 = a[1][2],
        a24 = a[1][3],
        a31 = a[2][0],
        a32 = a[2][1],
        a33 = a[2][2],
        a34 = a[2][3],
        a41 = a[3][0],
        a42 = a[3][1],
        a43 = a[3][2],
        a44 = a[3][3],

        b11 = b[0][0],
        b12 = b[0][1],
        b13 = b[0][2],
        b14 = b[0][3],
        b21 = b[1][0],
        b22 = b[1][1],
        b23 = b[1][2],
        b24 = b[1][3],
        b31 = b[2][0],
        b32 = b[2][1],
        b33 = b[2][2],
        b34 = b[2][3],
        b41 = b[3][0],
        b42 = b[3][1],
        b43 = b[3][2],
        b44 = b[3][3];

    return [ [a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41,
              a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42,
              a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43,
              a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44],
             [a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41,
              a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42,
              a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43,
              a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44],
             [a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41,
              a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42,
              a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43,
              a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44],
             [a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41,
              a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42,
              a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43,
              a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44] ];
  }

  function StaticTfm(obj)
  {
    var savThis = this;

    this.parent = obj;
    this.translate = function(x, y, z)
    {
      savThis.parent.ofsTfmAry.push(translateMatrix(x, y, z));
    };
    this.scale = function(scl)
    {
      var s = scl || 1;

      savThis.parent.ofsTfmAry.unshift(scaleMatrix(s));
      // lineWidth is in pixels (not world coords) so it soft scales
      savThis.parent.lineWidth *= s;
    };
    this.rotate = function(vx, vy, vz, deg)
    {
      // put rotate in front of array so there is no move of dwgOrg
      savThis.parent.ofsTfmAry.unshift(rotateMatrix(vx, vy, vz, deg));
    };
    this.revolve = function(vx, vy, vz, deg)
    {
      // revolve matrix is identical to rotate but may be applied after soft translate.
      savThis.parent.ofsTfmAry.push(rotateMatrix(vx, vy, vz, deg));
    };
    this.reset = function()
    {
      savThis.parent.ofsTfmAry = [];  // clear out the pending transforms
      savThis.parent.ofsTfm.reset();  // reset the accumulation matrix
    };
  }

  /* =========================================================
   * Generate the Normal to a plane, given 3 points (3D)
   * which define a plane.
   * The vector returned starts at 0,0,0
   * is 1 unit long in direction perpendicular to the plane.
   * Calculates A X B where p2-p1=A, p3-p1=B
   * --------------------------------------------------------*/
  calcNormal = function (p1, p2, p3)
  {
    var n = new Point(0, 0, 1),  // default if vectors degenerate
        a = new Point(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z),   // vector from p1 to p2
        b = new Point(p3.x-p1.x, p3.y-p1.y, p3.z-p1.z),   // vector from p1 to p3
        // a and b lie in the plane, a x b (cross product) is normal to both ie normal to plane
        // left handed coord system use left hand to get X product direction
        nx = a.y*b.z - a.z*b.y,
        ny = a.z*b.x - a.x*b.z,
        nz = a.x*b.y - a.y*b.x,
        mag = Math.sqrt(nx*nx + ny*ny + nz*nz);   // calc vector length

    if (mag)
    {
      n = new Point(nx/mag, ny/mag, nz/mag);      // make unit length in world coords
    }

    return n;
  };

  /* =========================================================
   * Calculate the included angle between 2 vectors
   * a, from base p1 to p2, and b, from p1 to p3.
   * --------------------------------------------------------*/
  calcIncAngle = function(p1, p2, p3)
  {
    var angRads = 0,
        a = new Point(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z),   // vector from p1 to p2
        b = new Point(p3.x-p1.x, p3.y-p1.y, p3.z-p1.z),   // vector from p1 to p3
        numerator = a.x*b.x + a.y*b.y + a.z*b.z,
        denominator	= Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z)*Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);

    if (denominator)
    {
      angRads = Math.acos(numerator/denominator);
    }

    return angRads*180.0/Math.PI;
  };

  Group3D = function()
  {
    this.type = "GROUP";                // enum of type to instruct the render method
    this.parent = null;                 // pointer to parent group if any
    this.children = [];                 // only Group3Ds have children
    this.dwgOrg = new Point(0, 0, 0);   // drawing origin (0,0,0) may get translated
    this.ofsTfmAry = [];
    this.ofsTfm = new TransformMatrix();    // Group's offset from any parent Group's current transform
    this.grpTfm = new TransformMatrix();    // Parent Group's current transform
    this.netTfm = new TransformMatrix();    // product of parent Group netTfm and this.ofsTfm
    this.centroid = new Point();
    // enable obj.transform.rotate etc. API
    this.transform = new StaticTfm(this);
    // add any objects passed by forwarding them to addObj
    this.addObj.apply(this, arguments);
  };

  Group3D.prototype.deleteObj = function(obj)
  {
    // remove from children array
    var idx = this.children.indexOf(obj);
    if (idx !== -1)
    {
      this.children.splice(idx, 1);
    }
  };

  Group3D.prototype.addObj = function()
  {
    var args = Array.prototype.slice.call(arguments), // grab array of arguments
        xSum = 0,
        ySum = 0,
        zSum = 0,
        numPts = 0,    // total point counter for all commands
        i, j;

    for (i=0; i<args.length; i++)
    {
      if (isArray(args[i]))
      {
        // check that only Group3Ds or Obj3Ds are passed
        for (j=0; j<args[i].length; j++)
        {
          if (args[i][j].type)
          {
            if (args[i][j].parent !== null)      // already a member of a Group3D, remove it
            {
              args[i][j].parent.deleteObj(args[i][j]);
            }
            // point the Obj3D or Group3D parent property at this Group3D
            args[i][j].parent = this;           // now its a free agent link it to this group
            this.children.push(args[i][j]);
            // enable drag and drop if this group has drag
            if (!args[i][j].dragNdrop && this.dragNdrop)
            {
              args[i][j].dragNdrop = this.dragNdrop;
            }
          }
        }
      }
      else
      {
        if (args[i].type)
        {
          if (args[i].parent !== null)       // already a member of a Group2D, remove it
          {
            args[i].parent.deleteObj(args[i]);
          }
          args[i].parent = this;            // now its a free agent link it to this group
          // point the Obj3D or Group3D parent property at this Group3D
          this.children.push(args[i]);
          // enable drag and drop if this group has drag
          if (!args[i].dragNdrop && this.dragNdrop)
          {
            args[i].dragNdrop = this.dragNdrop;
          }
        }
      }
    }
    for (j=0; j<this.children.length; j++)
    {
        // add the objects centroid to calc group centroid
        xSum += this.children[j].centroid.x;
        ySum += this.children[j].centroid.y;
        zSum += this.children[j].centroid.z;
        numPts++;
    }
    if (numPts)
    {
      this.centroid.x = xSum/numPts;       // get recalculated several times but never if no Obj3Ds
      this.centroid.y = ySum/numPts;
      this.centroid.z = zSum/numPts;
    }
  };

  /*======================================
   * Recursively apply a translation to
   * child Obj3Ds or children of Group3Ds
   * This is a permanent change to
   * do not use for animation, use
   * transform method instead.
   *-------------------------------------*/
  Group3D.prototype.translate = function(tx, ty, tz)
  {
    var x = tx || 0,
        y = ty || 0,
        z = tz || 0,
        transMat = translateMatrix(x, y, z);

    // Apply transform to the hardOfsTfm of all Obj3D children recursively
  	function iterate(grp)
  	{
  		grp.children.forEach(function(childNode){
  			if (childNode.type === "GROUP")
        {
  				iterate(childNode);
        }
        else
        {
          childNode.translate(x, y, z);
        }
  		});
  	}

    iterate(this);
    this.centroid.hardTransform(transMat);    // translate the centroid
  };

  /*======================================
   * Recursively apply the rotation to
   * children or children of children
   * This is a permanent change to
   * do not use for animation, use
   * transform method instead.
   *-------------------------------------*/
  Group3D.prototype.rotate = function(vx, vy, vz, angle)
  {
    var deg = angle || 0,
        rotMat = rotateMatrix(vx, vy, vz, deg);

    // Apply transform to the hardOfsTfm of all Obj3D children recursively
  	function iterate(grp)
  	{
  		grp.children.forEach(function(childNode){
  			if (childNode.type === "GROUP")
        {
  				iterate(childNode);
        }
        else
        {
          childNode.rotate(vx, vy, vz, deg);
        }
  		});
  	}

    iterate(this);
    this.centroid.hardTransform(rotMat);    // rotate the Group3D centroid
  };

  /*======================================
   * Recursively apply the scaling to
   * children or children of children
   * This is a permanent change to
   * do not use for animation, use
   * transform method instead.
   *-------------------------------------*/
  Group3D.prototype.scale = function(scale)
  {
    var s = scale || 1,
        sclMat = scaleMatrix(s);

    // Apply transform to the hardOfsTfm of all Obj3D children recursively
  	function iterate(grp)
  	{
  		grp.children.forEach(function(childNode){
  			if (childNode.type === "GROUP")
        {
  				iterate(childNode);
        }
        else
        {
          childNode.scale(s);
        }
  		});
  	}

    iterate(this);
    this.centroid.hardTransform(sclMat);    // scale the centroid
  };

  /*======================================
   * Recursively add drag object to Obj3D
   * decendants.
   * When rendered all these Obj3D will be
   * added to _draggables to be checked on
   * mousedown
   *-------------------------------------*/
  Group3D.prototype.enableDrag = function(grabFn, dragFn, dropFn)
  {
    var savThis = this;

  	function iterate(grp)
  	{
  		grp.children.forEach(function(childNode){
  			if (childNode.type === "GROUP")
        {
  				iterate(childNode);
        }
        else  // Obj3D
        {
          if (childNode.dragNdrop === null)    // don't over-write if its already assigned a handler
          {
            childNode.enableDrag(grabFn, dragFn, dropFn);
            childNode.dragNdrop.target = savThis;     // the Group2D is the target being dragged
          }
        }
  		});
  	}

    iterate(this);
  };

  /*======================================
   * Disable dragging on Obj3D children
   *-------------------------------------*/
  Group3D.prototype.disableDrag = function()
  {
    // Can't immediately remove from _draggables array (no Cango reference) but no harm
  	function iterate(grp)
  	{
  		grp.children.forEach(function(childNode){
  			if (childNode.type === "GROUP")
        {
  				iterate(childNode);
        }
        else
        {
          childNode.disableDrag();
        }
  		});
  	}

    iterate(this);
  };

  Obj3D = function(commands, objtype, options)
  {
    var opt, prop,
        xSum = 0,
        ySum = 0,
        zSum = 0,
        numPts = 0;    // total point counter for all commands

    this.type = "SHAPE";                // PATH, SHAPE, TEXT
    this.parent = null;                 // parent Group3D
    this.drawCmds = [];                 // array of DrawCmd3D objects
    this.bBoxCmds = [];                 // DrawCmd3D array for the text bounding box
    this.dwgOrg = new Point(0, 0, 0);   // drawing origin (0,0,0) may get translated
    this.centroid = new Point(0, 0, 0); // average of x, y, z coords
    this.normal = new Point(0, 0, 0);   // from centroid, normal to object plane
    this.dragNdrop = null;
    // properties handling transform inheritance
    this.hardOfsTfm = new TransformMatrix();// permanent, immediate, construction transform
    this.ofsTfmAry = [];                // accumulate transform matrices to be applied at render
    this.ofsTfm = new TransformMatrix();    // Obj3D's offset from any parent Group's current transform
    this.grpTfm = new TransformMatrix();    // Parent Group's current transform
    this.netTfm = new TransformMatrix();    // product of parent Group netTfm applied to this.ofsTfm
    this.lorgTfm = new TransformMatrix();   // text only, used for lorg effects
    // enable obj.transform.rotate etc. API
    this.transform = new StaticTfm(this);
    // properties set by setProperty. If undefined render uses Cango3D default
    this.strokeColor = null;            // used for PATHs and TEXT
    this.fillColor = null;              // used to fill SHAPEs
    this.backColor = null;              //  "    "   "    "
    this.backHidden = false;            // don't draw if normal pointing away
    this.lineWidth = 1;
    this.strokeCap = "butt";
    this.fontSize = null;               // TEXT only
    this.fontWeight = null;             // TEXT only
    this.lorg = 7;                      // TEXT only

    if (typeof objtype === 'string')
    {
      if (['PATH', 'SHAPE', 'TEXT'].indexOf(objtype) !== -1)
      {
        this.type = objtype;
      }
    }
    if (commands)
    {
      // send the Cgo3D (SVG) commands off to the canvas DrawCmd processor
      this.drawCmds = cgo3DtoDrawCmd3D(commands);
    }

    opt = (typeof options === 'object')? options: {};   // avoid undeclared object errors
    // check for all supported options
    for (prop in opt)
    {
      // check that this is opt's own property, not inherited from prototype
      if (opt.hasOwnProperty(prop))
      {
        this.setProperty(prop, opt[prop]);
      }
    }
    if (this.type === "SHAPE")
    {
      this.strokeCol = this.fillCol;  // shapes default to stroke and fill the same
    }
    if (this.type === "TEXT")
    {
      this.strokeCap = "round";
    }

    if (this.drawCmds.length)
    {
      this.drawCmds.forEach(function(dCmd){
        if (dCmd.ep !== undefined)  // check for Z command, has no coords
        {
          xSum += dCmd.ep.x;
          ySum += dCmd.ep.y;
          zSum += dCmd.ep.z;
          numPts++;
        }
      });
      this.centroid.x = xSum/numPts;
      this.centroid.y = ySum/numPts;
      this.centroid.z = zSum/numPts;

      if (this.drawCmds.length > 2)
      {
        // make the normal(o, a, b)  = aXb, = vector from centroid to data[0], b = centroid to data[1]
        this.normal = calcNormal(this.centroid, this.drawCmds[1].ep, this.drawCmds[2].ep);
        // NOTE: traverse CCW, normal is out of screen (+z), traverse path CW, normal is into screen (-z)
      }
      else
      {
        if (this.drawCmds.length === 2)    // if Bezier it will need a normal
        {
          if (this.drawCmds[1].cPts.length)
          {
            this.normal = calcNormal(this.centroid, this.drawCmds[1].ep, this.drawCmds[1].cPts[0]);
          }
          else
          {
            // straight line but make a normal for completeness
            this.normal.z = 1;
          }
        }
        else
        {
          return;
        }
      }
      // move normal to start from the centroid
      this.normal.x += this.centroid.x;
      this.normal.y += this.centroid.y;
      this.normal.z += this.centroid.z;
    }
  };

  /*=========================================================
   * Obj3D.translate
   * Generate a transform matrix to translate a 3D point
   * away to a position x,y,z from 0,0,0 the drawing origin.
   * If TEXT apply to hardTfmOfs for use at render, for
   * PATH or SHAPE multiply every point in outline path,
   * along with the centroid and normal, by this matrix.
   * The transformed x,y,z values overwrite the current
   * values.
   *
   * This function should be used in shape
   * construction not animation. Animation doesn't change
   * x,y,z, it uses them to get tx,ty,tz.
   *---------------------------------------------------------
   */
  Obj3D.prototype.translate = function(x, y, z)
  {
    var transMat = translateMatrix(x, y, z),
        k;

    if (this.type === "TEXT")
    {
      this.hardOfsTfm.applyTransform(transMat);
    }
    else
    {
      this.drawCmds.forEach(function(cmd){
        for (k=0; k<cmd.cPts.length; k++)   // transform each 3D Point
        {
          cmd.cPts[k].hardTransform(transMat);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (cmd.ep !== undefined)
        {
          cmd.ep.hardTransform(transMat);
        }
      });
    }
    this.centroid.hardTransform(transMat);  // translate the centroid
    this.normal.hardTransform(transMat);    // translate the normal
  };

  /*=========================================================
   * Obj3D.rotate
   * Generate a transformation matrix to rotate a 3D point
   * around the axis defined by vector vx,vy,vz by angle degs.
   * If TEXT apply to hardTfmOfs for use at render, for
   * PATH or SHAPE multiply every point in outline path,
   * along with the centroid and normal, by this matrix.
   * The transformed x,y,z values overwrite the current
   * values.
   *
   * This function should be used in shape
   * construction not animation. Animation doesn't change
   * x,y,z, it uses them to get tx,ty,tz.
   *---------------------------------------------------------
   */
  Obj3D.prototype.rotate = function(vx, vy, vz, deg)
  {
    var rotMat = rotateMatrix(vx, vy, vz, deg),
        k;

    if (this.type === "TEXT")
    {
      this.hardOfsTfm.applyTransform(rotMat);
    }
    else
    {
      this.drawCmds.forEach(function(cmd){
        for (k=0; k<cmd.cPts.length; k++)   // transform each 3D Point
        {
          cmd.cPts[k].hardTransform(rotMat);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (cmd.ep !== undefined)
        {
          cmd.ep.hardTransform(rotMat);
        }
      });
    }
    this.centroid.hardTransform(rotMat);    // rotate the centroid
    this.normal.hardTransform(rotMat);    // rotate the normal
  };

  /*=========================================================
   * Obj3D.scale
   * Generate a transformation matrix to scale a 3D point
   * relative to its drawing origin.
   * If TEXT apply to hardTfmOfs for use at render, for
   * PATH or SHAPE multiply every point in outline path,
   * along with the centroid and normal, by this matrix.
   * The transformed x,y,z values overwrite the current
   * values.
   *
   * This function should be used in shape
   * construction not animation. Animation doesn't change
   * x,y,z, it uses them to get tx,ty,tz.
   *---------------------------------------------------------
   */
  Obj3D.prototype.scale = function(scale)
  {
    var sclMat = scaleMatrix(scale),
        k;

    if (this.type === "TEXT")
    {
      this.hardOfsTfm.applyTransform(sclMat);
    }
    else
    {
      this.drawCmds.forEach(function(cmd){
        for (k=0; k<cmd.cPts.length; k++)   // transform each 3D Point
        {
          cmd.cPts[k].hardTransform(sclMat);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (cmd.ep !== undefined)
        {
          cmd.ep.hardTransform(sclMat);
        }
      });
    }
    this.centroid.hardTransform(sclMat);    // scale the centroid
    this.normal.hardTransform(sclMat);    // translate the normal
  };

  /*======================================
   * Flips the normal to point in opposite
   * direction. Useful if object coordinates
   * track CW. The normal is into screen if
   * outline is traversed CW (RH rule).
   *-------------------------------------*/
  Obj3D.prototype.flipNormal = function()
  {
    var nx = this.normal.x,
        ny = this.normal.y,
        nz = this.normal.z;

    this.normal.x = 2*this.centroid.x - nx;
    this.normal.y = 2*this.centroid.y - ny;
    this.normal.z = 2*this.centroid.z - nz;
  };

  Obj3D.prototype.enableDrag = function(grabFn, dragFn, dropFn)
  {
    this.dragNdrop = new Drag3D(grabFn, dragFn, dropFn);
    // fill in the Drag2D properties for use by callBacks
    this.dragNdrop.target = this;
  };

  Obj3D.prototype.disableDrag = function()
  {
    var aidx;

    if ((!this.dragNdrop)||(!this.dragNdrop.cgo))
    {
      return;
    }
    // remove this object from array to be checked on mousedown
    // remove this object from array to be checked on mousedown
    aidx = this.dragNdrop.cgo.dragObjects.indexOf(this);
    this.dragNdrop.cgo.dragObjects.splice(aidx, 1);
    this.dragNdrop = null;
  };

  Obj3D.prototype.setProperty = function(propertyName, value)
  {
    var color;

    if ((typeof propertyName !== "string")||(value === undefined)||(value === null))
    {
      return;
    }

    switch (propertyName.toLowerCase())
    {
      case "fillcolor":
        color = new RGBAColor(value);
        if (color.ok)
        {
          this.fillColor = color;
        }
        break;
      case "backcolor":
        color = new RGBAColor(value);
        if (color.ok)
        {
          this.backColor = color;
        }
        break;
      case "strokecolor":
        color = new RGBAColor(value);
        if (color.ok)
        {
          this.strokeColor = color;
        }
        break;
      case "linewidth":
      case "strokewidth":                 // for backward compatability
        this.lineWidth = value;
        break;
      case "linecap":
      case "strokecap":
        if (typeof value !== "string")
        {
          return;
        }
        if ((value === "butt")||(value === "round")||(value === "square"))
        {
          this.strokeCap = value;
        }
        break;
      case "fontsize":
        this.fontSize = value;
        break;
      case "fontweight":
        if ((typeof value === "string")||((typeof value === "number")&&(value>=100)&&(value<=900)))
        {
          this.fontWeight = value;
        }
        break;
      case "lorg":
        if ([1, 2, 3, 4, 5, 6, 7, 8, 9].indexOf(value) !== -1)
        {
          this.lorg = value;
        }
        break;
      case "width":             // for internal use compiling TEXT obj
        this.width = value;
        break;
      case "height":
        this.height = value;
        break;
      default:
        return;
    }
  };

  Obj3D.prototype.dup = function()
  {
    var newObj = new Obj3D();

    /* create a copy (not just a reference) of an object */
    function clone(obj)
    {
      var nObj = (isArray(obj)) ? [] : {},
          i;
      for (i in obj)
      {
        if (obj[i] && typeof obj[i] === "object")
        {
          nObj[i] = clone(obj[i]);
        }
        else
        {
          nObj[i] = obj[i];
        }
      }
      return nObj;
    }

    newObj.parent = this.parent;
    newObj.type = this.type;
    newObj.drawCmds = clone(this.drawCmds);
    newObj.bBoxCmds = clone(this.bBoxCmds);
    newObj.dwgOrg = clone(this.dwgOrg);
    newObj.centroid = clone(this.centroid);
    newObj.normal = clone(this.normal);
    newObj.hardOfsTfm = clone(this.hardOfsTfm);
    newObj.strokeColor = clone(this.strokeColor);
    newObj.fillColor = clone(this.fillColor);
    newObj.backColor = clone(this.backColor);
    newObj.backHidden = this.backHidden;
    newObj.lineWidth = this.lineWidth;
    newObj.strokeCap = this.strokeCap;
    newObj.fontSize = this.fontSize;
    newObj.fontWeight = this.fontWeight;
    newObj.lorg = this.lorg;
    newObj.width = this.width;
    newObj.height = this.height;

    return newObj;
  };

  /*-------------------------------------------------------------
   This text code is based on Jim Studt, CanvasTextFunctions
   see http://jim.studt.net/canvastext/
   It has been adapted to output Cgo3D format and has had Greek
   letters and a few symbols added from Hershey's original font
   -------------------------------------------------------------*/

  hersheyFont.letters = {
/*   */ ' ': {width:16, cdata:[]},
/* ! */ '!': {width:10, cdata:['M',5,21,0,'L',5,7,0,'M',5,2,0,'L',4,1,0,5,0,0,6,1,0,5,2,0]},
/* " */ '"': {width:16, cdata:['M',4,21,0,'L',4,14,0,'M',12,21,0,'L',12,14,0]},
/* # */ '#': {width:21, cdata:['M',11,25,0,'L',4,-7,0,'M',17,25,0,'L',10,-7,0,'M',4,12,0,'L',18,12,0,'M',3,6,0,'L',17,6,0]},
/* $ */ '$': {width:20, cdata:['M',8,25,0,'L',8,-4,0,'M',12,25,0,'L',12,-4,0,'M',17,18,0,'L',15,20,0,12,21,0,8,21,0,5,20,0,3,18,0,3,16,0,4,14,0,5,13,0,7,12,0,13,10,0,15,9,0,16,8,0,17,6,0,17,3,0,15,1,0,12,0,0,8,0,0,5,1,0,3,3,0]},
/* % */ '%': {width:24, cdata:['M',21,21,0,'L',3,0,0,'M',8,21,0,'L',10,19,0,10,17,0,9,15,0,7,14,0,5,14,0,3,16,0,3,18,0,4,20,0,6,21,0,8,21,0,10,20,0,13,19,0,16,19,0,19,20,0,21,21,0,'M',17,7,0,'L',15,6,0,14,4,0,14,2,0,16,0,0,18,0,0,20,1,0,21,3,0,21,5,0,19,7,0,17,7,0]},
/* & */ '&': {width:26, cdata:['M',23,12,0,'L',23,13,0,22,14,0,21,14,0,20,13,0,19,11,0,17,6,0,15,3,0,13,1,0,11,0,0,7,0,0,5,1,0,4,2,0,3,4,0,3,6,0,4,8,0,5,9,0,12,13,0,13,14,0,14,16,0,14,18,0,13,20,0,11,21,0,9,20,0,8,18,0,8,16,0,9,13,0,11,10,0,16,3,0,18,1,0,20,0,0,22,0,0,23,1,0,23,2,0]},
/* ' */ '\'': {width:10, cdata:['M',5,19,0,'L',4,20,0,5,21,0,6,20,0,6,18,0,5,16,0,4,15,0]},
/* ( */ '(': {width:14, cdata:['M',11,25,0,'L',9,23,0,7,20,0,5,16,0,4,11,0,4,7,0,5,2,0,7,-2,0,9,-5,0,11,-7,0]},
/* ) */ ')': {width:14, cdata:['M',3,25,0,'L',5,23,0,7,20,0,9,16,0,10,11,0,10,7,0,9,2,0,7,-2,0,5,-5,0,3,-7,0]},
/* * */ '*': {width:16, cdata:['M',8,15,0,'L',8,3,0,'M',3,12,0,'L',13,6,0,'M',13,12,0,'L',3,6,0]},
/* + */ '+': {width:26, cdata:['M',13,18,0,'L',13,0,0,'M',4,9,0,'L',22,9,0]},
/* , */ ',': {width:8, cdata:['M',5,4,0,'L',4,3,0,3,4,0,4,5,0,5,4,0,5,2,0,3,0,0]},
/* - */ '-': {width:26, cdata:['M',4,9,0,'L',22,9,0]},
/* . */ '.': {width:8, cdata:['M',4,5,0,'L',3,4,0,4,3,0,5,4,0,4,5,0]},
/* / */ '/': {width:22, cdata:['M',20,25,0,'L',2,-7,0]},
/* 0 */ '0': {width:20, cdata:['M',9,21,0,'L',6,20,0,4,17,0,3,12,0,3,9,0,4,4,0,6,1,0,9,0,0,11,0,0,14,1,0,16,4,0,17,9,0,17,12,0,16,17,0,14,20,0,11,21,0,9,21,0]},
/* 1 */ '1': {width:20, cdata:['M',6,17,0,'L',8,18,0,11,21,0,11,0,0]},
/* 2 */ '2': {width:20, cdata:['M',4,16,0,'L',4,17,0,5,19,0,6,20,0,8,21,0,12,21,0,14,20,0,15,19,0,16,17,0,16,15,0,15,13,0,13,10,0,3,0,0,17,0,0]},
/* 3 */ '3': {width:20, cdata:['M',5,21,0,'L',16,21,0,10,13,0,13,13,0,15,12,0,16,11,0,17,8,0,17,6,0,16,3,0,14,1,0,11,0,0,8,0,0,5,1,0,4,2,0,3,4,0]},
/* 4 */ '4': {width:20, cdata:['M',13,21,0,'L',3,7,0,18,7,0,'M',13,21,0,'L',13,0,0]},
/* 5 */ '5': {width:20, cdata:['M',15,21,0,'L',5,21,0,4,12,0,5,13,0,8,14,0,11,14,0,14,13,0,16,11,0,17,8,0,17,6,0,16,3,0,14,1,0,11,0,0,8,0,0,5,1,0,4,2,0,3,4,0]},
/* 6 */ '6': {width:20, cdata:['M',16,18,0,'L',15,20,0,12,21,0,10,21,0,7,20,0,5,17,0,4,12,0,4,7,0,5,3,0,7,1,0,10,0,0,11,0,0,14,1,0,16,3,0,17,6,0,17,7,0,16,10,0,14,12,0,11,13,0,10,13,0,7,12,0,5,10,0,4,7,0]},
/* 7 */ '7': {width:20, cdata:['M',17,21,0,'L',7,0,0,'M',3,21,0,'L',17,21,0]},
/* 8 */ '8': {width:20, cdata:['M',8,21,0,'L',5,20,0,4,18,0,4,16,0,5,14,0,7,13,0,11,12,0,14,11,0,16,9,0,17,7,0,17,4,0,16,2,0,15,1,0,12,0,0,8,0,0,5,1,0,4,2,0,3,4,0,3,7,0,4,9,0,6,11,0,9,12,0,13,13,0,15,14,0,16,16,0,16,18,0,15,20,0,12,21,0,8,21,0]},
/* 9 */ '9': {width:20, cdata:['M',16,14,0,'L',15,11,0,13,9,0,10,8,0,9,8,0,6,9,0,4,11,0,3,14,0,3,15,0,4,18,0,6,20,0,9,21,0,10,21,0,13,20,0,15,18,0,16,14,0,16,9,0,15,4,0,13,1,0,10,0,0,8,0,0,5,1,0,4,3,0]},
/* : */ ':': {width:8, cdata:['M',4,12,0,'L',3,11,0,4,10,0,5,11,0,4,12,0,'M',4,5,0,'L',3,4,0,4,3,0,5,4,0,4,5,0]},
/* ; */ ';': {width:8, cdata:['M',4,12,0,'L',3,11,0,4,10,0,5,11,0,4,12,0,'M',5,4,0,'L',4,3,0,3,4,0,4,5,0,5,4,0,5,2,0,3,0,0]},
/* < */ '<': {width:24, cdata:['M',20,18,0,'L',4,9,0,20,0,0]},
/* = */ '=': {width:26, cdata:['M',4,12,0,'L',22,12,0,'M',4,6,0,'L',22,6,0]},
/* > */ '>': {width:24, cdata:['M',4,18,0,'L',20,9,0,4,0,0]},
/* ? */ '?': {width:18, cdata:['M',3,16,0,'L',3,17,0,4,19,0,5,20,0,7,21,0,11,21,0,13,20,0,14,19,0,15,17,0,15,15,0,14,13,0,13,12,0,9,10,0,9,7,0,'M',9,2,0,'L',8,1,0,9,0,0,10,1,0,9,2,0]},
/* @ */ '@': {width:27, cdata:['M',18,13,0,'L',17,15,0,15,16,0,12,16,0,10,15,0,9,14,0,8,11,0,8,8,0,9,6,0,11,5,0,14,5,0,16,6,0,17,8,0,'M',12,16,0,'L',10,14,0,9,11,0,9,8,0,10,6,0,11,5,0,'M',18,16,0,'L',17,8,0,17,6,0,19,5,0,21,5,0,23,7,0,24,10,0,24,12,0,23,15,0,22,17,0,20,19,0,18,20,0,15,21,0,12,21,0,9,20,0,7,19,0,5,17,0,4,15,0,3,12,0,3,9,0,4,6,0,5,4,0,7,2,0,9,1,0,12,0,0,15,0,0,18,1,0,20,2,0,21,3,0,'M',19,16,0,'L',18,8,0,18,6,0,19,5,0]},
/* A */ 'A': {width:18, cdata:['M',9,21,0,'L',1,0,0,'M',9,21,0,'L',17,0,0,'M',4,7,0,'L',14,7,0]},
/* B */ 'B': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',13,21,0,16,20,0,17,19,0,18,17,0,18,15,0,17,13,0,16,12,0,13,11,0,'M',4,11,0,'L',13,11,0,16,10,0,17,9,0,18,7,0,18,4,0,17,2,0,16,1,0,13,0,0,4,0,0]},
/* C */ 'C': {width:21, cdata:['M',18,16,0,'L',17,18,0,15,20,0,13,21,0,9,21,0,7,20,0,5,18,0,4,16,0,3,13,0,3,8,0,4,5,0,5,3,0,7,1,0,9,0,0,13,0,0,15,1,0,17,3,0,18,5,0]},
/* D */ 'D': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',11,21,0,14,20,0,16,18,0,17,16,0,18,13,0,18,8,0,17,5,0,16,3,0,14,1,0,11,0,0,4,0,0]},
/* E */ 'E': {width:19, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',17,21,0,'M',4,11,0,'L',12,11,0,'M',4,0,0,'L',17,0,0]},
/* F */ 'F': {width:18, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',17,21,0,'M',4,11,0,'L',12,11,0]},
/* G */ 'G': {width:21, cdata:['M',18,16,0,'L',17,18,0,15,20,0,13,21,0,9,21,0,7,20,0,5,18,0,4,16,0,3,13,0,3,8,0,4,5,0,5,3,0,7,1,0,9,0,0,13,0,0,15,1,0,17,3,0,18,5,0,18,8,0,'M',13,8,0,'L',18,8,0]},
/* H */ 'H': {width:22, cdata:['M',4,21,0,'L',4,0,0,'M',18,21,0,'L',18,0,0,'M',4,11,0,'L',18,11,0]},
/* I */ 'I': {width:8, cdata:['M',4,21,0,'L',4,0,0]},
/* J */ 'J': {width:16, cdata:['M',12,21,0,'L',12,5,0,11,2,0,10,1,0,8,0,0,6,0,0,4,1,0,3,2,0,2,5,0,2,7,0]},
/* K */ 'K': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',18,21,0,'L',4,7,0,'M',9,12,0,'L',18,0,0]},
/* L */ 'L': {width:17, cdata:['M',4,21,0,'L',4,0,0,'M',4,0,0,'L',16,0,0]},
/* M */ 'M': {width:24, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',12,0,0,'M',20,21,0,'L',12,0,0,'M',20,21,0,'L',20,0,0]},
/* N */ 'N': {width:22, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',18,0,0,'M',18,21,0,'L',18,0,0]},
/* O */ 'O': {width:22, cdata:['M',9,21,0,'L',7,20,0,5,18,0,4,16,0,3,13,0,3,8,0,4,5,0,5,3,0,7,1,0,9,0,0,13,0,0,15,1,0,17,3,0,18,5,0,19,8,0,19,13,0,18,16,0,17,18,0,15,20,0,13,21,0,9,21,0]},
/* P */ 'P': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',13,21,0,16,20,0,17,19,0,18,17,0,18,14,0,17,12,0,16,11,0,13,10,0,4,10,0]},
/* Q */ 'Q': {width:22, cdata:['M',9,21,0,'L',7,20,0,5,18,0,4,16,0,3,13,0,3,8,0,4,5,0,5,3,0,7,1,0,9,0,0,13,0,0,15,1,0,17,3,0,18,5,0,19,8,0,19,13,0,18,16,0,17,18,0,15,20,0,13,21,0,9,21,0,'M',12,4,0,'L',18,-2,0]},
/* R */ 'R': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',13,21,0,16,20,0,17,19,0,18,17,0,18,15,0,17,13,0,16,12,0,13,11,0,4,11,0,'M',11,11,0,'L',18,0,0]},
/* S */ 'S': {width:20, cdata:['M',17,18,0,'L',15,20,0,12,21,0,8,21,0,5,20,0,3,18,0,3,16,0,4,14,0,5,13,0,7,12,0,13,10,0,15,9,0,16,8,0,17,6,0,17,3,0,15,1,0,12,0,0,8,0,0,5,1,0,3,3,0]},
/* T */ 'T': {width:16, cdata:['M',8,21,0,'L',8,0,0,'M',1,21,0,'L',15,21,0]},
/* U */ 'U': {width:22, cdata:['M',4,21,0,'L',4,6,0,5,3,0,7,1,0,10,0,0,12,0,0,15,1,0,17,3,0,18,6,0,18,21,0]},
/* V */ 'V': {width:18, cdata:['M',1,21,0,'L',9,0,0,'M',17,21,0,'L',9,0,0]},
/* W */ 'W': {width:24, cdata:['M',2,21,0,'L',7,0,0,'M',12,21,0,'L',7,0,0,'M',12,21,0,'L',17,0,0,'M',22,21,0,'L',17,0,0]},
/* X */ 'X': {width:20, cdata:['M',3,21,0,'L',17,0,0,'M',17,21,0,'L',3,0,0]},
/* Y */ 'Y': {width:18, cdata:['M',1,21,0,'L',9,11,0,9,0,0,'M',17,21,0,'L',9,11,0]},
/* Z */ 'Z': {width:20, cdata:['M',17,21,0,'L',3,0,0,'M',3,21,0,'L',17,21,0,'M',3,0,0,'L',17,0,0]},
/* [ */ '[': {width:14, cdata:['M',4,25,0,'L',4,-7,0,'M',5,25,0,'L',5,-7,0,'M',4,25,0,'L',11,25,0,'M',4,-7,0,'L',11,-7,0]},
/* \ */ '\\': {width:14, cdata:['M',0,21,0,'L',14,-3,0]},
/* ] */ ']': {width:14, cdata:['M',9,25,0,'L',9,-7,0,'M',10,25,0,'L',10,-7,0,'M',3,25,0,'L',10,25,0,'M',3,-7,0,'L',10,-7,0]},
/* ^ */ '^': {width:16, cdata:['M',8,23,0,'L',0,9,0,'M',8,23,0,'L',16,9,0]},
/* _ */ '_': {width:18, cdata:['M',0,-7,0,'L',18,-7,0]},
/* ` */ '`': {width:8, cdata:['M',5,16,0,'L',3,14,0,3,12,0,4,11,0,5,12,0,4,13,0,3,12,0]},
/* a */ 'a': {width:19, cdata:['M',15,14,0,'L',15,0,0,'M',15,11,0,'L',13,13,0,11,14,0,8,14,0,6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0]},
/* b */ 'b': {width:19, cdata:['M',4,21,0,'L',4,0,0,'M',4,11,0,'L',6,13,0,8,14,0,11,14,0,13,13,0,15,11,0,16,8,0,16,6,0,15,3,0,13,1,0,11,0,0,8,0,0,6,1,0,4,3,0]},
/* c */ 'c': {width:18, cdata:['M',15,11,0,'L',13,13,0,11,14,0,8,14,0,6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0]},
/* d */ 'd': {width:19, cdata:['M',15,21,0,'L',15,0,0,'M',15,11,0,'L',13,13,0,11,14,0,8,14,0,6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0]},
/* e */ 'e': {width:18, cdata:['M',3,8,0,'L',15,8,0,15,10,0,14,12,0,13,13,0,11,14,0,8,14,0,6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0]},
/* f */ 'f': {width:12, cdata:['M',10,21,0,'L',8,21,0,6,20,0,5,17,0,5,0,0,'M',2,14,0,'L',9,14,0]},
/* g */ 'g': {width:19, cdata:['M',15,14,0,'L',15,-2,0,14,-5,0,13,-6,0,11,-7,0,8,-7,0,6,-6,0,'M',15,11,0,'L',13,13,0,11,14,0,8,14,0,6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0]},
/* h */ 'h': {width:19, cdata:['M',4,21,0,'L',4,0,0,'M',4,10,0,'L',7,13,0,9,14,0,12,14,0,14,13,0,15,10,0,15,0,0]},
/* i */ 'i': {width:8, cdata:['M',3,21,0,'L',4,20,0,5,21,0,4,22,0,3,21,0,'M',4,14,0,'L',4,0,0]},
/* j */ 'j': {width:10, cdata:['M',5,21,0,'L',6,20,0,7,21,0,6,22,0,5,21,0,'M',6,14,0,'L',6,-3,0,5,-6,0,3,-7,0,1,-7,0]},
/* k */ 'k': {width:17, cdata:['M',4,21,0,'L',4,0,0,'M',14,14,0,'L',4,4,0,'M',8,8,0,'L',15,0,0]},
/* l */ 'l': {width:8, cdata:['M',4,21,0,'L',4,0,0]},
/* m */ 'm': {width:30, cdata:['M',4,14,0,'L',4,0,0,'M',4,10,0,'L',7,13,0,9,14,0,12,14,0,14,13,0,15,10,0,15,0,0,'M',15,10,0,'L',18,13,0,20,14,0,23,14,0,25,13,0,26,10,0,26,0,0]},
/* n */ 'n': {width:19, cdata:['M',4,14,0,'L',4,0,0,'M',4,10,0,'L',7,13,0,9,14,0,12,14,0,14,13,0,15,10,0,15,0,0]},
/* o */ 'o': {width:19, cdata:['M',8,14,0,'L',6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0,16,6,0,16,8,0,15,11,0,13,13,0,11,14,0,8,14,0]},
/* p */ 'p': {width:19, cdata:['M',4,14,0,'L',4,-7,0,'M',4,11,0,'L',6,13,0,8,14,0,11,14,0,13,13,0,15,11,0,16,8,0,16,6,0,15,3,0,13,1,0,11,0,0,8,0,0,6,1,0,4,3,0]},
/* q */ 'q': {width:19, cdata:['M',15,14,0,'L',15,-7,0,'M',15,11,0,'L',13,13,0,11,14,0,8,14,0,6,13,0,4,11,0,3,8,0,3,6,0,4,3,0,6,1,0,8,0,0,11,0,0,13,1,0,15,3,0]},
/* r */ 'r': {width:13, cdata:['M',4,14,0,'L',4,0,0,'M',4,8,0,'L',5,11,0,7,13,0,9,14,0,12,14,0]},
/* s */ 's': {width:17, cdata:['M',14,11,0,'L',13,13,0,10,14,0,7,14,0,4,13,0,3,11,0,4,9,0,6,8,0,11,7,0,13,6,0,14,4,0,14,3,0,13,1,0,10,0,0,7,0,0,4,1,0,3,3,0]},
/* t */ 't': {width:12, cdata:['M',5,21,0,'L',5,4,0,6,1,0,8,0,0,10,0,0,'M',2,14,0,'L',9,14,0]},
/* u */ 'u': {width:19, cdata:['M',4,14,0,'L',4,4,0,5,1,0,7,0,0,10,0,0,12,1,0,15,4,0,'M',15,14,0,'L',15,0,0]},
/* v */ 'v': {width:16, cdata:['M',2,14,0,'L',8,0,0,'M',14,14,0,'L',8,0,0]},
/* w */ 'w': {width:22, cdata:['M',3,14,0,'L',7,0,0,'M',11,14,0,'L',7,0,0,'M',11,14,0,'L',15,0,0,'M',19,14,0,'L',15,0,0]},
/* x */ 'x': {width:17, cdata:['M',3,14,0,'L',14,0,0,'M',14,14,0,'L',3,0,0]},
/* y */ 'y': {width:16, cdata:['M',2,14,0,'L',8,0,0,'M',14,14,0,'L',8,0,0,6,-4,0,4,-6,0,2,-7,0,1,-7,0]},
/* z */ 'z': {width:17, cdata:['M',14,14,0,'L',3,0,0,'M',3,14,0,'L',14,14,0,'M',3,0,0,'L',14,0,0]},
/* { */ '{': {width:14, cdata:['M',9,25,0,'L',7,24,0,6,23,0,5,21,0,5,19,0,6,17,0,7,16,0,8,14,0,8,12,0,6,10,0,'M',7,24,0,'L',6,22,0,6,20,0,7,18,0,8,17,0,9,15,0,9,13,0,8,11,0,4,9,0,8,7,0,9,5,0,9,3,0,8,1,0,7,0,0,6,-2,0,6,-4,0,7,-6,0,'M',6,8,0,'L',8,6,0,8,4,0,7,2,0,6,1,0,5,-1,0,5,-3,0,6,-5,0,7,-6,0,9,-7,0]},
/* | */ '|': {width:8, cdata:['M',4,25,0,'L',4,-7,0]},
/* } */ '}': {width:14, cdata:['M',5,25,0,'L',7,24,0,8,23,0,9,21,0,9,19,0,8,17,0,7,16,0,6,14,0,6,12,0,8,10,0,'M',7,24,0,'L',8,22,0,8,20,0,7,18,0,6,17,0,5,15,0,5,13,0,6,11,0,10,9,0,6,7,0,5,5,0,5,3,0,6,1,0,7,0,0,8,-2,0,8,-4,0,7,-6,0,'M',8,8,0,'L',6,6,0,6,4,0,7,2,0,8,1,0,9,-1,0,9,-3,0,8,-5,0,7,-6,0,5,-7,0]},
/* ~ */ '~': {width:24, cdata:['M',3,6,0,'L',3,8,0,4,11,0,6,12,0,8,12,0,10,11,0,14,8,0,16,7,0,18,7,0,20,8,0,21,10,0,'M',3,8,0,'L',4,10,0,6,11,0,8,11,0,10,10,0,14,7,0,16,6,0,18,6,0,20,7,0,21,10,0,21,12,0]},
/* &Alpha; */   '\u0391': {width:18, cdata:['M',9,21,0,'L',1,0,0,'M',9,21,0,'L',17,0,0,'M',4,7,0,'L',14,7,0]},
/* &Beta; */    '\u0392': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',13,21,0,16,20,0,17,19,0,18,17,0,18,15,0,17,13,0,16,12,0,13,11,0,'M',4,11,0,'L',13,11,0,16,10,0,17,9,0,18,7,0,18,4,0,17,2,0,16,1,0,13,0,0,4,0,0]},
/* &Chi; */     '\u03A7': {width:20, cdata:['M',3,21,0,'L',17,0,0,'M',3,0,0,'L',17,21,0]},
/* &Delta; */   '\u0394': {width:18, cdata:['M',9,21,0,'L',1,0,0,'M',9,21,0,'L',17,0,0,'M',1,0,0,'L',17,0,0]},
/* &Epsilon; */ '\u0395': {width:19, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',17,21,0,'M',4,11,0,'L',12,11,0,'M',4,0,0,'L',17,0,0]},
/* &Phi; */     '\u03A6': {width:20, cdata:['M',10,21,0,'L',10,0,0,'M',8,16,0,'L',5,15,0,4,14,0,3,12,0,3,9,0,4,7,0,5,6,0,8,5,0,12,5,0,15,6,0,16,7,0,17,9,0,17,12,0,16,14,0,15,15,0,12,16,0,8,16,0]},
/* &Gamma; */   '\u0393': {width:17, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',16,21,0]},
/* &Eta; */     '\u0397': {width:22, cdata:['M',4,21,0,'L',4,0,0,'M',18,21,0,'L',18,0,0,'M',4,11,0,'L',18,11,0]},
/* &Iota; */    '\u0399': {width:8, cdata:['M',4,21,0,'L',4,0,0]},
/* &middot; */  '\u00B7': {width:5, cdata:['M',2,10,0,'L',2,9,0,3,9,0,3,10,0,2,10,0]},
/* &Kappa; */   '\u039A': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',18,21,0,'L',4,7,0,'M',9,12,0,'L',18,0,0]},
/* &Lambda; */  '\u039B': {width:18, cdata:['M',9,21,0,'L',1,0,0,'M',9,21,0,'L',17,0,0]},
/* &Mu; */      '\u039C': {width:24, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',12,0,0,'M',20,21,0,'L',12,0,0,'M',20,21,0,'L',20,0,0]},
/* &Nu; */      '\u039D': {width:22, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',18,0,0,'M',18,21,0,'L',18,0,0]},
/* &Omicron; */ '\u039F': {width:22, cdata:['M',9,21,0,'L',7,20,0,5,18,0,4,16,0,3,13,0,3,8,0,4,5,0,5,3,0,7,1,0,9,0,0,13,0,0,15,1,0,17,3,0,18,5,0,19,8,0,19,13,0,18,16,0,17,18,0,15,20,0,13,21,0,9,21,0]},
/* &Pi; */      '\u03A0': {width:22, cdata:['M',4,21,0,'L',4,0,0,'M',18,21,0,'L',18,0,0,'M',4,21,0,'L',18,21,0]},
/* &Theta; */   '\u0398': {width:22, cdata:['M',9,21,0,'L',7,20,0,5,18,0,4,16,0,3,13,0,3,8,0,4,5,0,5,3,0,7,1,0,9,0,0,13,0,0,15,1,0,17,3,0,18,5,0,19,8,0,19,13,0,18,16,0,17,18,0,15,20,0,13,21,0,9,21,0,'M',8,11,0,'L',14,11,0]},
/* &Rho; */     '\u03A1': {width:21, cdata:['M',4,21,0,'L',4,0,0,'M',4,21,0,'L',13,21,0,16,20,0,17,19,0,18,17,0,18,14,0,17,12,0,16,11,0,13,10,0,4,10,0]},
/* &Sigma; */   '\u03A3': {width:18, cdata:['M',2,21,0,'L',9,11,0,2,0,0,'M',2,21,0,'L',16,21,0,'M',2,0,0,'L',16,0,0]},
/* &Tau; */     '\u03A4': {width:16, cdata:['M',8,21,0,'L',8,0,0,'M',1,21,0,'L',15,21,0]},
/* &upsih; */   '\u03A5': {width:18, cdata:['M',2,16,0,'L',2,18,0,3,20,0,4,21,0,6,21,0,7,20,0,8,18,0,9,14,0,9,0,0,'M',16,16,0,'L',16,18,0,15,20,0,14,21,0,12,21,0,11,20,0,10,18,0,9,14,0]},
/* &deg; */     '\u00B0': {width:14, cdata:['M',6,21,0,'L',4,20,0,3,18,0,3,16,0,4,14,0,6,13,0,8,13,0,10,14,0,11,16,0,11,18,0,10,20,0,8,21,0,6,21,0]},
/* &Omega; */   '\u03A9': {width:20, cdata:['M',3,0,0,'L',7,0,0,4,7,0,3,11,0,3,15,0,4,18,0,6,20,0,9,21,0,11,21,0,14,20,0,16,18,0,17,15,0,17,11,0,16,7,0,13,0,0,17,0,0]},
/* &Xi; */      '\u039E': {width:18, cdata:['M',2,21,0,'L',16,21,0,'M',6,11,0,'L',12,11,0,'M',2,0,0,'L',16,0,0]},
/* &Psi; */     '\u03A8': {width:22, cdata:['M',11,21,0,'L',11,0,0,'M',2,15,0,'L',3,15,0,4,14,0,5,10,0,6,8,0,7,7,0,10,6,0,12,6,0,15,7,0,16,8,0,17,10,0,18,14,0,19,15,0,20,15,0]},
/* &Zeta; */    '\u0396': {width:20, cdata:['M',17,21,0,'L',3,0,0,'M',3,21,0,'L',17,21,0,'M',3,0,0,'L',17,0,0]},
/* &alpha; */   '\u03B1': {width:21, cdata:['M',9,14,0,'L',7,13,0,5,11,0,4,9,0,3,6,0,3,3,0,4,1,0,6,0,0,8,0,0,10,1,0,13,4,0,15,7,0,17,11,0,18,14,0,'M',9,14,0,'L',11,14,0,12,13,0,13,11,0,15,3,0,16,1,0,17,0,0,18,0,0]},
/* &beta; */    '\u03B2': {width:19, cdata:['M',12,21,0,'L',10,20,0,8,18,0,6,14,0,5,11,0,4,7,0,3,1,0,2,-7,0,'M',12,21,0,'L',14,21,0,16,19,0,16,16,0,15,14,0,14,13,0,12,12,0,9,12,0,'M',9,12,0,'L',11,11,0,13,9,0,14,7,0,14,4,0,13,2,0,12,1,0,10,0,0,8,0,0,6,1,0,5,2,0,4,5,0]},
/* &chi; */     '\u03C7': {width:18, cdata:['M',2,14,0,'L',4,14,0,6,12,0,12,-5,0,14,-7,0,16,-7,0,'M',17,14,0,'L',16,12,0,14,9,0,4,-2,0,2,-5,0,1,-7,0]},
/* &delta; */   '\u03B4': {width:18, cdata:['M',11,14,0,'L',8,14,0,6,13,0,4,11,0,3,8,0,3,5,0,4,2,0,5,1,0,7,0,0,9,0,0,11,1,0,13,3,0,14,6,0,14,9,0,13,12,0,11,14,0,9,16,0,8,18,0,8,20,0,9,21,0,11,21,0,13,20,0,15,18,0]},
/* &epsilon; */ '\u03B5': {width:16, cdata:['M',13,12,0,'L',12,13,0,10,14,0,7,14,0,5,13,0,5,11,0,6,9,0,9,8,0,'M',9,8,0,'L',5,7,0,3,5,0,3,3,0,4,1,0,6,0,0,9,0,0,11,1,0,13,3,0]},
/* &phi; */     '\u03C6': {width:22, cdata:['M',8,13,0,'L',6,12,0,4,10,0,3,7,0,3,4,0,4,2,0,5,1,0,7,0,0,10,0,0,13,1,0,16,3,0,18,6,0,19,9,0,19,12,0,17,14,0,15,14,0,13,12,0,11,8,0,9,3,0,6,-7,0]},
/* &gamma; */   '\u03B3': {width:19, cdata:['M',1,11,0,'L',3,13,0,5,14,0,6,14,0,8,13,0,9,12,0,10,9,0,10,5,0,9,0,0,'M',17,14,0,'L',16,11,0,15,9,0,9,0,0,7,-4,0,6,-7,0]},
/* &eta; */     '\u03B7': {width:20, cdata:['M',1,10,0,'L',2,12,0,4,14,0,6,14,0,7,13,0,7,11,0,6,7,0,4,0,0,'M',6,7,0,'L',8,11,0,10,13,0,12,14,0,14,14,0,16,12,0,16,9,0,15,4,0,12,-7,0]},
/* &iota; */    '\u03B9': {width:11, cdata:['M',6,14,0,'L',4,7,0,3,3,0,3,1,0,4,0,0,6,0,0,8,2,0,9,4,0]},
/* &times; */   '\u00D7': {width:22, cdata:['M',4,16,0,'L',18,2,0,'M',18,16,0,'L',4,2,0]},
/* &kappa; */   '\u03BA': {width:18, cdata:['M',6,14,0,'L',2,0,0,'M',16,13,0,'L',15,14,0,14,14,0,12,13,0,8,9,0,6,8,0,5,8,0,'M',5,8,0,'L',7,7,0,8,6,0,10,1,0,11,0,0,12,0,0,13,1,0]},
/* &lambda; */  '\u03BB': {width:16, cdata:['M',1,21,0,'L',3,21,0,5,20,0,6,19,0,14,0,0,'M',8,14,0,'L',2,0,0]},
/* &mu; */      '\u03BC': {width:21, cdata:['M',7,14,0,'L',1,-7,0,'M',6,10,0,'L',5,5,0,5,2,0,7,0,0,9,0,0,11,1,0,13,3,0,15,7,0,'M',17,14,0,'L',15,7,0,14,3,0,14,1,0,15,0,0,17,0,0,19,2,0,20,4,0]},
/* &nu; */      '\u03BD': {width:18, cdata:['M',3,14,0,'L',6,14,0,5,8,0,4,3,0,3,0,0,'M',16,14,0,'L',15,11,0,14,9,0,12,6,0,9,3,0,6,1,0,3,0,0]},
/* &omicron; */ '\u03BF': {width:17, cdata:['M',8,14,0,'L',6,13,0,4,11,0,3,8,0,3,5,0,4,2,0,5,1,0,7,0,0,9,0,0,11,1,0,13,3,0,14,6,0,14,9,0,13,12,0,12,13,0,10,14,0,8,14,0]},
/* &pi; */      '\u03C0': {width:22, cdata:['M',9,14,0,'L',5,0,0,'M',14,14,0,'L',15,8,0,16,3,0,17,0,0,'M',2,11,0,'L',4,13,0,7,14,0,20,14,0]},
/* &thetasym; */'\u03D1': {width:21, cdata:['M',1,10,0,'L',2,12,0,4,14,0,6,14,0,7,13,0,7,11,0,6,6,0,6,3,0,7,1,0,8,0,0,10,0,0,12,1,0,14,4,0,15,6,0,16,9,0,17,14,0,17,17,0,16,20,0,14,21,0,12,21,0,11,19,0,11,17,0,12,14,0,14,11,0,16,9,0,19,7,0]},
/* &rho; */     '\u03C1': {width:18, cdata:['M',4,8,0,'L',4,5,0,5,2,0,6,1,0,8,0,0,10,0,0,12,1,0,14,3,0,15,6,0,15,9,0,14,12,0,13,13,0,11,14,0,9,14,0,7,13,0,5,11,0,4,8,0,0,-7,0]},
/* &sigma; */   '\u03C3': {width:20, cdata:['M',18,14,0,'L',8,14,0,6,13,0,4,11,0,3,8,0,3,5,0,4,2,0,5,1,0,7,0,0,9,0,0,11,1,0,13,3,0,14,6,0,14,9,0,13,12,0,12,13,0,10,14,0]},
/* &tau; */     '\u03C4': {width:20, cdata:['M',11,14,0,'L',8,0,0,'M',2,11,0,'L',4,13,0,7,14,0,18,14,0]},
/* &upsilon; */ '\u03C5': {width:20, cdata:['M',1,10,0,'L',2,12,0,4,14,0,6,14,0,7,13,0,7,11,0,5,5,0,5,2,0,7,0,0,9,0,0,12,1,0,14,3,0,16,7,0,17,11,0,17,14,0]},
/* &divide; */  '\u00F7': {width:26, cdata:['M',13,18,0,'L',12,17,0,13,16,0,14,17,0,13,18,0,'M',4,9,0,'L',22,9,0,'M',13,2,0,'L',12,1,0,13,0,0,14,1,0,13,2,0]},
/* &omega; */   '\u03C9': {width:23, cdata:['M',8,14,0,'L',6,13,0,4,10,0,3,7,0,3,4,0,4,1,0,5,0,0,7,0,0,9,1,0,11,4,0,'M',12,8,0,'L',11,4,0,12,1,0,13,0,0,15,0,0,17,1,0,19,4,0,20,7,0,20,10,0,19,13,0,18,14,0]},
/* &xi; */      '\u03BE': {width:16, cdata:['M',10,21,0,'L',8,20,0,7,19,0,7,18,0,8,17,0,11,16,0,14,16,0,'M',11,16,0,'L',8,15,0,6,14,0,5,12,0,5,10,0,7,8,0,10,7,0,12,7,0,'M',10,7,0,'L',6,6,0,4,5,0,3,3,0,3,1,0,5,-1,0,9,-3,0,10,-4,0,10,-6,0,8,-7,0,6,-7,0]},
/* &psi; */     '\u03C8': {width:23, cdata:['M',16,21,0,'L',8,-7,0,'M',1,10,0,'L',2,12,0,4,14,0,6,14,0,7,13,0,7,11,0,6,6,0,6,3,0,7,1,0,9,0,0,11,0,0,14,1,0,16,3,0,18,6,0,20,11,0,21,14,0]},
/* &zeta; */    '\u03B6': {width:15, cdata:['M',10,21,0,'L',8,20,0,7,19,0,7,18,0,8,17,0,11,16,0,14,16,0,'M',14,16,0,'L',10,14,0,7,12,0,4,9,0,3,6,0,3,4,0,4,2,0,6,0,0,9,-2,0,10,-4,0,10,-6,0,9,-7,0,7,-7,0,6,-5,0]},
/* &theta; */   '\u03B8': {width:21, cdata:['M',12,21,0,'L',9,20,0,7,18,0,5,15,0,4,13,0,3,9,0,3,5,0,4,2,0,5,1,0,7,0,0,9,0,0,12,1,0,14,3,0,16,6,0,17,8,0,18,12,0,18,16,0,17,19,0,16,20,0,14,21,0,12,21,0,'M',4,11,0,'L',18,11,0]}
  };

  hersheyFont.strWidth = function(fontSize, str)
  {
    var total = 0,
        i, c;

    for (i=0; i<str.length; i++)
    {
    	c = hersheyFont.letters[str.charAt(i)];
    	if (c)
      {
        total += c.width * fontSize / 25.0;
      }
    }

    return total;
  };

  hersheyFont.stringToCgo3D = function(str)
  {
    var i, c,
        wid = 0,
        hgt = 0,
        charData, cgoData = [];

    function shiftChar(cAry, d)    // cAry = Hershey Cgo3D array, d = shift required
    {
      var newAry = [],
          x, y, z,
          j = 0;
      while (j<cAry.length)
      {
        if (typeof cAry[j] === "string")
        {
          newAry.push(cAry[j++]);      // push the command letter
        }
        x = cAry[j++] + d;   // j now index of x coord in x,y,z triplet
        y = cAry[j++];
        z = cAry[j++];
        newAry.push(x, y, z);
      }
      return newAry;
    }

    for (i=0; i<str.length; i++)
    {
      c = hersheyFont.letters[str.charAt(i)];
      if (c)
      {
        charData = shiftChar(c.cdata, wid);
        wid += c.width;               // add character width to total
        cgoData = cgoData.concat(charData);   // make a single array of drawCmds3D for the whole string
      }
    }
    /* Note: char cell is 33 pixels high, char size is 22 pixels (0 to 21), descenders go to -7 to 21.
       passing 'size' to a draw text function scales char height by size/33.
       Reference height for vertically alignment is charHeight = 29 of the fontSize in pixels. */
    hgt = 29;       // current font size in pixels
    // wid = string width in pixels

    return {"cgoData": cgoData, "width": wid, "height": hgt};
  };

  function initDragAndDrop(savThis)
  {
    function dragHandler(evt)
    {
      var event = evt || window.event,
          csrPos, testObj, len, j;

      function getCursorPos(e)
      {
        // pass in any mouse event, returns the position of the cursor in raw pixel coords
        var rect = savThis.cnvs.getBoundingClientRect();

        return {x: e.clientX - rect.left, y: e.clientY - rect.top};
      }

      function hitTest(pathObj, csrX, csrY)
      {
        var i;
        // create the path (don't stroke it - no-one will see) to test for hit
        savThis.ctx.beginPath();
        if (pathObj.type === 'TEXT')   // use bounding box not drawCmds
        {
          for (i=0; i<pathObj.bBoxCmds.length; i++)
          {
            savThis.ctx[pathObj.bBoxCmds[i].drawFn].apply(savThis.ctx, pathObj.bBoxCmds[i].parmsPx);
          }
        }
        else
        {
          for (i=0; i<pathObj.drawCmds.length; i++)
          {
            savThis.ctx[pathObj.drawCmds[i].drawFn].apply(savThis.ctx, pathObj.drawCmds[i].parmsPx);
          }
        }
/*
    // for diagnostics on hit region, uncomment
    savThis.ctx.strokeStyle = 'red';
    savThis.ctx.lineWidth = 4;
    savThis.ctx.stroke();
*/
        return savThis.ctx.isPointInPath(csrX, csrY);
      }

      csrPos = getCursorPos(event);  // savThis is any Cango ctx on the canvas
      // run through all the registered objects and test if cursor pos is in their path
      len = savThis.cnvs.dragObjects.length;
      for (j = savThis.cnvs.dragObjects.length-1; j >= 0; j--)  // search from last drawn to first (underneath)
      {
        testObj = savThis.cnvs.dragObjects[j];
        if (hitTest(testObj, csrPos.x, csrPos.y))
        {
          // call the grab handler for this object (check it is still enabled)
          if (testObj.dragNdrop)
          {
            testObj.dragNdrop.grab(event, testObj);
            break;
          }
        }
      }

    }

    // =========== Start Here ===========

    savThis.cnvs.onmousedown = dragHandler;
  }

  Cango3D = function(canvasId)
  {
    this.cId = canvasId;
    this.cnvs = document.getElementById(canvasId);
    if (this.cnvs === null)
    {
      alert("can't find canvas "+canvasId);
      return;
    }
    this.rawWidth = this.cnvs.offsetWidth;
    this.rawHeight = this.cnvs.offsetHeight;
    this.aRatio = this.rawWidth/this.rawHeight;
    if (!this.cnvs.hasOwnProperty('dragObjects'))  // only 1st Cango instance makes the array
    {
      // create an array to hold all the draggable objects for this canvas
      this.cnvs.dragObjects = [];
    }
    if (!this.cnvs.hasOwnProperty('resized'))
    {
      // make canvas native aspect ratio equal style box aspect ratio.
      // Note: rawWidth and rawHeight are floats, assignment to ints will truncate
      this.cnvs.setAttribute('width', this.rawWidth);    // reset canvas pixels width
      this.cnvs.setAttribute('height', this.rawHeight);  // don't use style for this
      this.cnvs.resized = true;
    }
    this.ctx = this.cnvs.getContext('2d');    // draw direct to screen canvas
    this.vpW = this.rawWidth;         // vp width in pixels (no more viewport so use full canvas)
    this.vpH = this.rawHeight;        // vp height in pixels, canvas height = width/aspect ratio
    this.vpLLx = 0;                   // vp lower left of viewport (not used) from canvas left, in pixels
    this.vpLLy = this.rawHeight;      // vp lower left of viewport from canvas top
    this.xscl = 1;                    // world x axis scale factor, default: pixels
    this.yscl = -1;                   // world y axis scale factor, +ve up (always -xscl since isotropic)
    this.xoffset = 0;                 // world x origin offset from viewport left in pixels
    this.yoffset = 0;                 // world y origin offset from viewport bottom in pixels
    this.ctx.textAlign = "left";      // all offsets are handled by lorg facility
    this.ctx.textBaseline = "top";
    this.penCol = new RGBAColor("black");
    this.penWid = 1;            // pixels
    this.lineCap = "butt";
    this.paintCol = new RGBAColor("steelblue");
    this.backCol = new RGBAColor("gray");
    this.fontSize = 10;         // 10pt
    this.fontWeight = 400;      // 100 .. 900 (400 normal, 700 bold)
    this.fov = 45;              // 45 deg looks better. 60 is absolute max for good perspective effect
    this.viewpointDistance = this.rawWidth/(this.xscl*Math.tan(this.fov*Math.PI/360)); // world coords
    this.lightSource = {x:0, y:100, z:500};     // world coords
    this.plotNormals = false;   // diagnostic, if true green (toward) or red (away) normals are drawn

    initDragAndDrop(this);
  };

  Cango3D.prototype.toPixelCoords3D = function(x, y, z)
  {
    // transform x,y,z in world coords to canvas pixel coords (top left is 0,0,0 y axis +ve down)
    var xPx = this.vpLLx+this.xoffset+x*this.xscl,
        yPx = this.vpLLy+this.yoffset+y*this.yscl,
        zPx = z*this.xscl;

    return {x: xPx, y: yPx, z:zPx};
  };

  Cango3D.prototype.toWorldCoords3D = function(xPx, yPx, zPx)
  {
    // transform xPx,yPx,zPx in raw canvas pixels to world coords (lower left is 0,0 +ve up)
    var xW = (xPx - this.vpLLx - this.xoffset)/this.xscl,
        yW = (yPx - this.vpLLy - this.yoffset)/this.yscl,
        zW = zPx/this.xscl;

    return {x: xW, y: yW, z:zW};
  };

  Cango3D.prototype.getCursorPos = function(evt)
  {
    // pass in any mouse event, returns the position of the cursor in raw pixel coords
    var e = evt||window.event,
        rect = this.cnvs.getBoundingClientRect();

    return {x: e.clientX - rect.left, y: e.clientY - rect.top, z:0};
  };

  Cango3D.prototype.getCursorPosWC = function(evt)
  {
    // pass in any mouse event, returns the position of the cursor in raw pixel coords
    var e = evt||window.event,
        rect = this.cnvs.getBoundingClientRect(),
        xW = (e.clientX - rect.left - this.vpLLx - this.xoffset)/this.xscl,
        yW = (e.clientY - rect.top - this.vpLLy - this.yoffset)/this.yscl;

    return {x: xW, y: yW, z: 0};
  };

  Cango3D.prototype.clearCanvas = function(fillColor)
  {
    if (fillColor !== undefined)
    {
      this.ctx.save();            // going to change fillStyle, save current
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(0, 0, this.rawWidth, this.rawHeight);
      this.ctx.restore();
    }
    else
    {
      this.ctx.clearRect(0, 0, this.rawWidth, this.rawHeight);
    }
    // all drawing erased, but graphics contexts remain intact
    // clear the dragObjects array, draggables put back when rendered
    this.cnvs.dragObjects.length = 0;
  };

  Cango3D.prototype.setWorldCoords3D = function(leftX, lowerY, spanX)
  {
    if (spanX >0)
    {
      this.xscl = this.vpW/spanX;
      this.yscl = -this.xscl;
      this.xoffset = -leftX*this.xscl;
      this.yoffset = -lowerY*this.yscl;
    }
    else
    {
      this.xscl = this.rawWidth/100;    // makes xaxis = 100 native units
      this.yscl = -this.rawWidth/100;   // makes yaxis = 100*aspect ratio ie. square pixels
      this.xoffset = 0;
      this.yoffset = 0;
    }
    this.setFOV(this.fov);              // reset the viewpoint distance in world coords
  };

  Cango3D.prototype.setPropertyDefault = function(propertyName, value)
  {
    var newCol;

    if ((typeof propertyName !== "string")||(value === undefined)||(value === null))
    {
      return;
    }
    switch (propertyName.toLowerCase())
    {
      case "backgroundcolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.cnvs.style.backgroundColor = newCol.toRGBA();
        }
        break;
      case "fillcolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.paintCol = newCol;
        }
        break;
      case "backcolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.backCol = newCol;
        }
        break;
      case "strokecolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.penCol = newCol;
        }
        break;
      case "strokewidth":
      case "linewidth":
        this.penWid = value;
        break;
      case "linecap":
        if (typeof value !== "string")
        {
          return;
        }
        if ((value === "butt")||(value === "round")||(value === "square"))
        {
          this.lineCap = value;
        }
        break;
      case "fontsize":
        if (isNumber(value) && (value >= 6)&&(value <= 60))
        {
          this.fontSize = value;
        }
        break;
      case "fontweight":
        if (isNumber(value) && (value >= 100)&&(value <= 900))
        {
          this.fontWeight = value;
        }
        break;
      default:
        return;
    }
  };

  Cango3D.prototype.setFOV = function(deg)  // viewpoint distance in world coords
  {
    var savThis = this;

    function fovToVPdist(fov)
    {
      var w = savThis.rawWidth;
      var ll = savThis.xoffset;
      var x, fon2;

      if (ll<0)
      {
        ll = 0;
      }
      if  (ll>w)
      {
        ll = w;
      }

      x = Math.abs(w/2 - ll) + w/2;
      x /= savThis.xscl;

      fon2 = Math.PI*fov/(360);

      return x/Math.tan(fon2);
    }

    // set field of view <60deg for good perspective
    if ((deg <= 60)&&(deg>=20))
    {
      this.fov = deg;
      this.viewpointDistance = fovToVPdist(this.fov);
    }
  };

  Cango3D.prototype.setLightSource = function(x, y, z)    // x, y, z in world coords
  {
    if ((x !== undefined)&&(y !== undefined)&&(z !== undefined))
    {
      this.lightSource.x = x;
      this.lightSource.y = y;
      this.lightSource.z = z;
    }
  };

  // this method allows the Object Group3D to be passed the Cango3D environment
  Cango3D.prototype.createGroup3D = function()
  {
    var grp = new Group3D();
    grp.addObj.apply(grp, arguments);

    return grp;
  };

  Cango3D.prototype.compilePath3D = function(path, color, lineWidth)
  {
    var lineWd = lineWidth || this.penWid,
        obj = new Obj3D(path, "PATH", {"strokeColor":color, "lineWidth":lineWd});

    return obj;   // object of type Obj3D
  };

  Cango3D.prototype.compileShape3D = function(path, fillColor, bkCol)
  {
    var obj = new Obj3D(path, "SHAPE", {"fillColor":fillColor, "backColor":bkCol});

    return obj;   // object of type Obj3D
  };

  Cango3D.prototype.compileText3D = function(str, color, pxlSize, fontWt, lorigin)
  {
    var strData, obj,
        size = this.fontSize,
        weight = this.fontWeight,
        ll, ul, lr, ur,
        dy;

    if (isNumber(pxlSize) && (pxlSize >= 6) && (pxlSize <= 60))
    {
      size = pxlSize;
    }
    if (isNumber(fontWt) && (fontWt > 99) && (fontWt < 901))
    {
      weight = fontWt;
    }

    strData = hersheyFont.stringToCgo3D(str);
    obj = new Obj3D(strData.cgoData, "TEXT", {"strokeColor":color, "fontSize":size,
                                       "fontWeight":weight, "lorg":lorigin,
                                       "width":strData.width, "height":strData.height,
                                       "lineWidth": 1});
    // construct the DrawCmds for the text bounding box
    dy = 0.25*obj.height;   // correct for alphabetic baseline, its offset about 0.25*char height
    ll = new Point(0, -dy, 0);
    lr = new Point(obj.width, -dy, 0);
    ul = new Point(0, obj.height-dy, 0);
    ur = new Point(obj.width, obj.height-dy, 0);
    // construct the DrawCmd3Ds for the text bounding box
    obj.bBoxCmds[0] = new DrawCmd3D("moveTo", [], ul);
    obj.bBoxCmds[1] = new DrawCmd3D("lineTo", [], ll);
    obj.bBoxCmds[2] = new DrawCmd3D("lineTo", [], lr);
    obj.bBoxCmds[3] = new DrawCmd3D("lineTo", [], ur);
    obj.bBoxCmds[4] = new DrawCmd3D("closePath", []);

    return obj;
  };

  Cango3D.prototype.tagShape3D = function(shpObj, txtObj, xOfs, yOfs)
  {
    var dx = xOfs || 0,
        dy = yOfs || 0;

    if (shpObj.type !== 'SHAPE')
    {
      return null;
    }
    txtObj.translate(dx, dy, 0);
    txtObj.backHidden = true;
    txtObj.centroid.x = shpObj.centroid.x;    // so sorting doesn't put shape in front
    txtObj.centroid.y = shpObj.centroid.y;
    txtObj.centroid.z = shpObj.centroid.z;
    txtObj.normal.x = shpObj.normal.x;
    txtObj.normal.y = shpObj.normal.y;
    txtObj.normal.z = shpObj.normal.z;

    return new Group3D(shpObj, txtObj);  // shape always drawn first since centroids equal
  };

  Cango3D.prototype.appendTag = function(grp, txtObj, xOfs, yOfs)
  {
    var shpObj = grp.children[0],
        dx = xOfs || 0,
        dy = yOfs || 0;

    if (shpObj.type !== 'SHAPE')
    {
      return;
    }
    txtObj.translate(dx, dy, 0);
    txtObj.backHidden = true;
    txtObj.centroid.x = shpObj.centroid.x;    // so sorted doesn't put shape in front
    txtObj.centroid.y = shpObj.centroid.y;
    txtObj.centroid.z = shpObj.centroid.z;
    txtObj.normal.x = shpObj.normal.x;
    txtObj.normal.y = shpObj.normal.y;
    txtObj.normal.z = shpObj.normal.z;

    grp.addObj(txtObj);
  };

  /*=========================================================
   * JSONtoObj3D
   * Convert the JS object parsed from JSON string into
   * an Obj3D or Group3D of Obj3D.
   * usage:
   * (load a file as a string into 'var jsonStr')
   * var jsonData = JSON.parse(jsonStr);
   * obj = cgo.JSONtoObj3D(jsonData);
   *---------------------------------------------------------
   */
  Cango3D.prototype.JSONtoObj3D = function(jsonData)
  {
    var output, data;

    function makeObj(data)
    {
      var obj,
          fillCol = (data.fillColor)? new RGBAColor(data.fillColor) : null,
          strokeCol = (data.strokeColor)? new RGBAColor(data.strokeColor) : null,
          backCol = (data.backColor)? new RGBAColor(data.backColor) : null,
          lineWid = data.lineWidth || 1;

      if (data.type === "GROUP")
      {
        obj = new Group3D();
      }
      else if (data.type === "PATH")
      {
        obj = new Obj3D(data.pathData, "PATH");
      }
      else if (data.type === "SHAPE")
      {
        obj = new Obj3D(data.pathData, "SHAPE");
      }
      else if (data.type === "TEXT")
      {
        obj = new Obj3D(data.pathData, "TEXT");
        // convert the text bounding box back into DrawCmd3Ds
        obj.bBoxCmds = cgo3DtoDrawCmd3D(data.textBoxData);
      }
      if (data.hardOfsTfm)
      {
        obj.hardOfsTfm = data.hardOfsTfm;
      }
      // save the name if any
      if (data.name)
      {
        obj.name = data.name.slice(0);
      }
      //  overwrite the calculated centroid and normal (saved will handle flipNormal)
      if (data.centroid)
      {
        obj.centroid = new Point(data.centroid[0], data.centroid[1], data.centroid[2]);
      }
      if (data.normal)
      {
        obj.normal = new Point(data.normal[0], data.normal[1], data.normal[2]);
      }
      if (obj.type !== "GROUP")      // fill in the other properties of Obj3D
      {
        obj.fillColor = fillCol;
        obj.strokeColor = strokeCol;
        obj.backColor = backCol;
        obj.lineWidth = lineWid;
        obj.backHidden = data.backHidden || false;
        obj.fontSize = data.fontSize || null;
        obj.fontWeight = data.fontWeight || null;
        obj.width = data.width || null;
        obj.height = data.height || null;
        obj.lorg = data.lorg || 7;
        obj.strokeCap = data.strokeCap || 'butt';
      }
      return obj;
    }

  	function iterate(task, node, grp)
  	{
  	  var x, item, childNode;
  		for(x=0; x < node.children.length; x++)
  		{
  			childNode = node.children[x];
  			item = task(childNode);   // if child type is GROUP a new Group3D is returned
        grp.addObj(item);
  			if (childNode.type === "GROUP")
        {
  				iterate(task, childNode, item);     // item will be a Group3D
        }
   		}
  	}

    data = jsonData.ComponentData;    // componentdata is always an object
    if (data.type === "GROUP")
    {
      output = this.createGroup3D();
      iterate(makeObj, data, output);
    }
    else
    {
      output = makeObj(data); // returns SHAPE, PATH or TEXT data
    }

    return output;
  };

  function drawCmd3DToCgo3D(dCmds)
  {
    var ary = [];

    function rnd(val)
    {
      return Math.round(val*1000)/1000;
    }

    function drawCmdtoCgo3D(drawCmd)
    {
      switch (drawCmd.drawFn)
      {
        case "moveTo":
          ary.push("M");
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "lineTo":
          ary.push("L");
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "bezierCurveTo":
          ary.push("C");
          ary.push(rnd(drawCmd.cPts[0].x), rnd(drawCmd.cPts[0].y), rnd(drawCmd.cPts[0].z));
          ary.push(rnd(drawCmd.cPts[1].x), rnd(drawCmd.cPts[1].y), rnd(drawCmd.cPts[1].z));
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "quadraticCurveTo":
          ary.push("Q");
          ary.push(rnd(drawCmd.cPts[0].x), rnd(drawCmd.cPts[0].y), rnd(drawCmd.cPts[0].z));
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "closePath":
          ary.push("Z");
        break;
      }
    }

    if (isArray(dCmds))
    {
      dCmds.forEach(drawCmdtoCgo3D);
    }
    else
    {
      drawCmdtoCgo3D(dCmds);
    }

    return ary;
  }

  /*=========================================================
   * Obj3DtoJSON
   * Convert the Obj3D data to a JSON string format.
   * The JSON string encoding can be saved to a file for
   * re-use without the neccessity of maintaining and running
   * the object creation code.
   * 'name' and 'id' are optional, saved with the JSON data.
   * The JSON string version must still be compiled back to
   * an Obj3D for drawing but this is a simple process
   * use: obj = this.JSONtoObj3D(jsonData)
   *---------------------------------------------------------
   */
  Cango3D.prototype.Obj3DtoJSON = function(obj, nameStr)
  {
    var output = {
          'type': "Component",
          'name': nameStr || "Object1",
          'ComponentData': {}
        };

    function rnd(val)
    {
      return Math.round(val*1000)/1000;
    }

    function formatObj3DData(obj)
    {
      var data = {};

      if (obj.type === "GROUP")
      {
        data.type = "GROUP";
        data.children = [];
        return data;
      }

      data.type = obj.type;                       // PATH, SHAPE, TEXT
      if (obj.fillColor)
      {
        data.fillColor = obj.fillColor.toRGBA();    // save as 'rgba(r, g, b, a)'
      }
      if (obj.strokeColor)
      {
        data.strokeColor = obj.strokeColor.toRGBA();
      }
      if (obj.backColor)
      {
        data.backColor = obj.backColor.toRGBA();
      }
      data.backHidden = obj.backHidden;    // boolean
      data.hardOfsTfm = obj.hardOfsTfm;    // object
      if (obj.lineWidth)
      {
        data.lineWidth = obj.lineWidth;
      }
      if (obj.strokeCap)
      {
        data.strokeCap = obj.strokeCap.slice(0);
      }
      if (obj.fontSize)
      {
        data.fontSize = obj.fontSize;
      }
      if (obj.fontWeight)
      {
        data.fontWeight = obj.fontWeight;
      }
      if (obj.lorg)
      {
        data.lorg = obj.lorg;
      }
      if (obj.width)
      {
        data.width = obj.width;
      }
      if (obj.height)
      {
        data.height = obj.height;
      }
      if (obj.name)
      {
        data.name = obj.name.slice(0);   // make a string not a reference
      }
      data.pathData = drawCmd3DToCgo3D(obj.drawCmds);
      if (obj.type === "TEXT") // save the Text bounding box for dragNdrop
      {
        data.textBoxData = drawCmd3DToCgo3D(obj.bBoxCmds);
      }
      // save centroid and normal (in case they've been flipped)
      data.centroid = [];
      data.centroid.push(rnd(obj.centroid.x), rnd(obj.centroid.y), rnd(obj.centroid.z));
      data.normal = [];
      data.normal.push(rnd(obj.normal.x), rnd(obj.normal.y), rnd(obj.normal.z));

      return data;
    }

    //task:function, node:object with children
  	function iterate(task, node, outAry)
  	{
  	  var item;
  		node.children.forEach(function(childNode){
  			item = task(childNode);   // if child is a Group3D a new array for its kids is returned
        outAry.push(item);
  			if (childNode.type === "GROUP")
        {
  				iterate(task, childNode, item.children);     // item will be an array
        }
   		});
  	}

    if (obj.type === "GROUP")
    {
      output.ComponentData.type = "GROUP";
      output.ComponentData.children = [];
      iterate(formatObj3DData, obj, output.ComponentData.children);
    }
    else
    {
      output.ComponentData = formatObj3DData(obj); // returns SHAPE, PATH or TEXT data
    }

    return JSON.stringify(output);
  };

  Cango3D.prototype.renderFrame = function(obj)
  {
    var savThis = this;

    function drawObj()
    {
      savThis.render(obj);  // canvas will be clear each frame
    }

    window.requestAnimationFrame(drawObj);
  };

  /*=============================================
   * render will clear the canvas and draw
   * this Group3D or Obj3D, make sure it is only
   * called on the root object of the scene.
   * If an Obj3D is passed, update the netTfm
   * and render it.
   * If a Group3D is passed, recursively update
   * the netTfm of the group's family tree, put
   * all the tree's objects into one array,
   * sort according to z, then render all Obj3Ds.
   *--------------------------------------------*/
  Cango3D.prototype.render = function(rootObj)  // Obj3D or Group3D, 'wireframe', 'noclear' strings accepted
  {
    var savThis = this,
        args,
        clear = true,
        wireframe = false,
        drawableObjs = [],
        i;

    function configTextObj(txtObj)
    {
      var dx = 0, dy = 0,
          transMat, sclMat,
          size, mag,
          wid = txtObj.width,
          hgt = txtObj.height,
          wid2 = wid/2,
          hgt2 = hgt/2,
          lorgWC = [0, [0, hgt],  [wid2, hgt],  [wid, hgt],
                       [0, hgt2], [wid2, hgt2], [wid, hgt2],
                       [0, 0],    [wid2, 0],    [wid, 0]];

      // calc lorg offset
      if (lorgWC[txtObj.lorg] !== undefined)  // check for out of bounds
      {
        dx = -lorgWC[txtObj.lorg][0];
        dy = -lorgWC[txtObj.lorg][1];
      }
      dy += 0.25*hgt;   // correct for alphabetic baseline, its offset about 0.25*char height
      transMat = translateMatrix(dx, dy, 0);
      // scale by fontSize
      size = txtObj.fontSize || savThis.fontSize;     // Cango3D instance current default
      size /= savThis.xscl;     // size is in pixels, dividing by xscl compensates for world coord scaling
      mag = size/33;            // size/3 is scale factor to match Hershey font size to canvas font size
      sclMat = scaleMatrix(mag);
      // now calc net transform (lorgTfm to be applied prior to hardTfmOfs)
      txtObj.lorgTfm.matrix = matrixMult(transMat, sclMat);
    }

    function transformDrawCmds(obj)
    {
      // apply the netTfm matrix to all the drawCmds coordinates
      var j, k;

      if (obj.type === "TEXT")
      {
        // construct matrix that does lorg transform then netTransform
        obj.lorgTfm.applyTransform(obj.netTfm.matrix);
        obj.drawCmds.forEach(function(cmd){
          for (k=0; k < cmd.cPts.length; k++)   // transform each 3D Point
          {
            cmd.cPts[k].softTransform(obj.lorgTfm.matrix);
          }
          // add the end point (check it exists since 'closePath' has no end point)
          if (cmd.ep !== undefined)
          {
            cmd.ep.softTransform(obj.lorgTfm.matrix);
          }
        });
        // now transform the text bounding box (just moveTo and lineTo, no cPts)
        for(j=0; j < obj.bBoxCmds.length; j++)   // step through the draw segments
        {
          // check for ep since 'closePath' has no end point)
          if (obj.bBoxCmds[j].ep !== undefined)
          {
            obj.bBoxCmds[j].ep.softTransform(obj.lorgTfm.matrix);
          }
        }
      }
      else
      {
        obj.drawCmds.forEach(function(cmd){
          for (k=0; k < cmd.cPts.length; k++)   // transform each 3D Point
          {
            cmd.cPts[k].softTransform(obj.netTfm.matrix);
          }
          // add the end point (check it exists since 'closePath' has no end point)
          if (cmd.ep !== undefined)
          {
            cmd.ep.softTransform(obj.netTfm.matrix);
          }
        });
      }
      // new transform the text bounding box
    }

    function applyXfms(obj)
    {
      var grp = obj.parent || null;

      if (grp)  // will be null for the rootObj
      {
        obj.grpTfm = grp.netTfm;  // grpTfm is always netTfm of the parent Group2D
      }
      if (obj.type === "GROUP")
      {
        // now re-calc the group's netTfm which will be passed on to its kids
        obj.ofsTfmAry.forEach(function(oft){
          obj.ofsTfm.applyTransform(oft);    // ofsTfmAry is array of 4x4 matrices
        });
        // obj.ofsTfm now is updated, reset the ofsTfmAry array
        obj.ofsTfmAry.length = 0;
        obj.netTfm.matrix = matrixMult(obj.ofsTfm.matrix, obj.grpTfm.matrix);
        // apply this to the group drawing origin for drag and drop
        obj.dwgOrg = new Point();
        obj.dwgOrg.softTransform(obj.netTfm.matrix);
        // apply the netTfm to the grp centroid
        obj.centroid.softTransform(obj.netTfm.matrix);
      }
      else
      {
        if (obj.type === "TEXT")
        {
          configTextObj(obj);    // apply a translate transform to handle lorg offset
          // this sets lorgTfm translate and scale
        }
        // now calc the offset transforms
        obj.ofsTfm.reset();
        obj.ofsTfmAry.forEach(function(oft){
          obj.ofsTfm.applyTransform(oft);    // ofsTfmAry is array of 4x4 matrices
        });
        // obj.ofsTfm now is updated, reset the ofsTfmAry array
        obj.ofsTfmAry.length = 0;
        // apply group transfroms to the offset transforms (these are net 'soft' transforms)
        obj.ofsTfm.applyTransform(obj.grpTfm.matrix);   // apply grpTfm to result
        // centroid and normal already have hard transforms applied, apply soft transforms
        obj.centroid.softTransform(obj.ofsTfm.matrix);  // transform the centroid
        obj.normal.softTransform(obj.ofsTfm.matrix);    // transform the normal
        // now apply the soft to the hard transforms
        obj.netTfm.matrix = matrixMult(obj.hardOfsTfm.matrix, obj.ofsTfm.matrix);
        // calc the transformed dwgOrg coords, dwgOrg only moved by softTfm and group softTfms
        obj.dwgOrg = new Point();
        if (obj.type === "TEXT")
        {
          obj.dwgOrg.hardTransform(obj.lorgTfm.matrix);  // lorg may move dwgOrg not centroid & normal
        }
        obj.dwgOrg.softTransform(obj.netTfm.matrix);

        transformDrawCmds(obj);
      }
    }

    function recursiveApplyXfms(rootGrp)
    {
      // task:function, grp: group with children
    	function iterate(task, obj)
    	{
     		task(obj);
  			if (obj.type === "GROUP")
        {
      		obj.children.forEach(function(childNode){
      				iterate(task, childNode);
          });
      	}
      }
      // now propagate the current grpTfm through the tree of children
      iterate(applyXfms, rootGrp);
    }

    function obj3Dto2D(obj)
    {
      var j, k;

      function project3D(point)
      {
        // projection is onto screen at z = 0,
        var s = savThis.viewpointDistance/(savThis.viewpointDistance-point.tz);
        // perspective projection
        point.fx = point.tx * s;
        point.fy = point.ty * s;
      }

      // make the 2D parameters for each DrawCmd3D in drawCmds array
      for(j=0; j<obj.drawCmds.length; j++)   // step through the path segments
      {
        for (k=0; k<obj.drawCmds[j].cPts.length; k++)   // extract flattened 2D coords from 3D Points
        {
          project3D(obj.drawCmds[j].cPts[k]);             // apply perspective to nodes
          obj.drawCmds[j].parms[2*k] = obj.drawCmds[j].cPts[k].fx;
          obj.drawCmds[j].parms[2*k+1] = obj.drawCmds[j].cPts[k].fy;
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (obj.drawCmds[j].ep !== undefined)
        {
          project3D(obj.drawCmds[j].ep);                    // apply perspective to end point
          obj.drawCmds[j].parms[2*k] = obj.drawCmds[j].ep.fx;
          obj.drawCmds[j].parms[2*k+1] = obj.drawCmds[j].ep.fy;
        }
      }
      // new the text bounding box
      if (obj.type === "TEXT")
      {
        // now project the text bounding box path
        for(j=0; j<4; j++)   // step through the draw segments (ignore final 'closePath')
        {
          project3D(obj.bBoxCmds[j].ep);                  // apply perspective to end point
          obj.bBoxCmds[j].parms[0] = obj.bBoxCmds[j].ep.fx;
          obj.bBoxCmds[j].parms[1] = obj.bBoxCmds[j].ep.fy;
        }
      }
      project3D(obj.centroid);  // project in case they are going to be drawn for debugging
      project3D(obj.normal);
      // the object's drawCmds parms arrays now hold world coord 2D projection ready to be drawn
    }

  	function sortDrawableObjs(grp)
  	{
      function paintersSort(p1, p2)
      {
        return p1.centroid.tz - p2.centroid.tz;
      }

      // Depth sorting (painters algorithm, draw from the back to front)
      grp.children.sort(paintersSort);
      // step through the children looking for groups (to sort)
  		grp.children.forEach(function(childNode){
  			if (childNode.type === "GROUP") // skip Obj3D
        {
  				sortDrawableObjs(childNode);  // check if next group has drawables
        }
        else   // child Obj3D ready to paint
        {
          drawableObjs.push(childNode);
        }
  		});
  	}

// ============ Start Here =====================================================

    // check arguments for 'wireframe' or 'noclear'
    args = Array.prototype.slice.call(arguments); // grab array of arguments
    for(i=0; i<arguments.length; i++)
    {
      if ((typeof args[i] === 'string')&&(args[i].toLowerCase() === 'wireframe'))
      {
        wireframe = true;
      }
      if ((typeof args[i] === 'string')&&(args[i].toLowerCase() === 'noclear'))
      {
        clear = false;
      }
    }
    if (clear === true)
    {
      this.clearCanvas();
    }
    if (rootObj.type === "GROUP")
    {
      recursiveApplyXfms(rootObj);   // recursively re-calculate the object transforms and apply them
      // depth sort and paint to the canvas
      sortDrawableObjs(rootObj);  // recursive depth sort group tree into array of Obj3D

      drawableObjs.forEach(function(drwObj){
        obj3Dto2D(drwObj);
        // now render them onto the canvas checking for back is facing and backHidden
        if (!(!wireframe && !savThis.frontFacing(drwObj) && drwObj.backHidden))
        {
          savThis.paintObj3D(drwObj, wireframe);
        }
      });
    }
    else  // no sorting needed
    {
      applyXfms(rootObj);
      obj3Dto2D(rootObj);
      if (!(!wireframe && !savThis.frontFacing(rootObj) && rootObj.backHidden))
      {
        this.paintObj3D(rootObj, wireframe);
      }
    }
  };

/*========================================================
 * paintObj3D takes an Obj3D which has been transformed
 * and projected to 2D all the canvas commands are
 * formatted but in world coordinates.
 * Convert to canvas pixels and draw them onto the canvas
 *-------------------------------------------------------*/
  Cango3D.prototype.paintObj3D = function(pg, wireframe)
  {
    var j, k,
        ox, oy, nx, ny,
        stkCol;

    this.ctx.save();   // save the current ctx we are going to change bits
    this.ctx.beginPath();
    // step through the Obj3D drawCmds array and draw each one
    for (j=0; j < pg.drawCmds.length; j++)
    {
      // convert all parms to pixel coords
      for (k=0; k<pg.drawCmds[j].parms.length; k+=2)   // step thru the coords in x,y pairs
      {
        pg.drawCmds[j].parmsPx[k] = this.vpLLx+this.xoffset+pg.drawCmds[j].parms[k]*this.xscl;
        pg.drawCmds[j].parmsPx[k+1] = this.vpLLy+this.yoffset+pg.drawCmds[j].parms[k+1]*this.yscl;
      }
      // now actually draw the path onto the canvas
      this.ctx[pg.drawCmds[j].drawFn].apply(this.ctx, pg.drawCmds[j].parmsPx);
    }
    if (pg.type === "TEXT")
    {
      // construct the bounding box pixel coords for drag and drop
      for (j=0; j < pg.bBoxCmds.length; j++)
      {
        // all parms already in pixel coords
        for (k=0; k<pg.bBoxCmds[j].parms.length; k+=2)   // step thru the coords in x,y pairs
        {
          pg.bBoxCmds[j].parmsPx[k] = this.vpLLx+this.xoffset+pg.bBoxCmds[j].parms[k]*this.xscl;
          pg.bBoxCmds[j].parmsPx[k+1] = this.vpLLy+this.yoffset+pg.bBoxCmds[j].parms[k+1]*this.yscl;
        }
      }
    }
    // fill and stroke the path
    if (pg.type === "SHAPE")
    {
      this.ctx.closePath();
      this.ctx.lineWidth = 1;
      if (!wireframe)
      {
        this.ctx.fillStyle = this.calcShapeShade(pg);
        this.ctx.strokeStyle = this.ctx.fillStyle;
        this.ctx.fill();
        if (pg.fillColor.a > 0.9)    // only stroke if solid color (don't stroke see-through panels)
        {
          this.ctx.stroke();    // stroke outline
        }
      }
      else  // wireframe - just stroke outline
      {
        stkCol = pg.strokeColor || this.penCol;
        this.ctx.strokeStyle = stkCol.toRGBA();
        this.ctx.lineCap = this.lineCap;
        this.ctx.stroke();    // stroke outline
      }
    }
    else  // PATH or TEXT
    {
      stkCol = pg.strokeColor || this.penCol;
      this.ctx.strokeStyle = stkCol.toRGBA();
      this.ctx.lineWidth = pg.lineWidth;
      if (pg.type === "TEXT")
      {
        // for TEXT, lineWidth just stores all softTransform scaling, so set lineWidth by fontWeight
        this.ctx.lineWidth *= 0.08*pg.fontSize*pg.fontWeight/400; // normal weight stroke width is saved
      }
      this.ctx.lineCap = pg.strokeCap;
      this.ctx.stroke();    // stroke outline
    }

    if (this.plotNormals)      // draw the normal
    {     // convert the centroid and normal too
      ox = this.vpLLx+this.xoffset+pg.centroid.fx*this.xscl;
      oy = this.vpLLy+this.yoffset+pg.centroid.fy*this.yscl;
      nx = this.vpLLx+this.xoffset+pg.normal.fx*this.xscl;
      ny = this.vpLLy+this.yoffset+pg.normal.fy*this.yscl;

      if (pg.centroid.tz < pg.normal.tz)    // +ve out of screen
      {
        this.ctx.strokeStyle = "green";   // pointing toward viewer
      }
      else
      {
        this.ctx.strokeStyle = "red";     // pointing away from viewer
      }

      this.ctx.beginPath();
      this.ctx.moveTo(ox, oy);
      this.ctx.lineTo(nx, ny);
      this.ctx.stroke();
    }
    this.ctx.restore();  // put things back the way they were

    if (pg.dragNdrop !== null)
    {
      pg.dragNdrop.cgo = this;
      // now push it into Cango.dragObjects array, its checked by canvas mousedown event handler
      if (!this.cnvs.dragObjects.contains(pg))
      {
        this.cnvs.dragObjects.push(pg);
      }
    }
  };

  Cango3D.prototype.frontFacing = function(obj)
  {
        // calc unit vector normal to the panel front
    var normX = obj.normal.tx-obj.centroid.tx,
        normY = obj.normal.ty-obj.centroid.ty,
        normZ = obj.normal.tz-obj.centroid.tz,
        // calc unit vector from centroid to viewpoint
        losX = -obj.centroid.tx,
        losY = -obj.centroid.ty,
        losZ = this.viewpointDistance - obj.centroid.tz;
    /* Now calculate if we are looking at front or back
       if normal dot product with LOS is +ve its the front, -ve its the back */

    return (normX*losX + normY*losY + normZ*losZ > 0);
  };

  Cango3D.prototype.calcShapeShade = function(obj)
  {
    var col, lum,
        sunX, sunY, sunZ, sunMag,
        normX, normY, normZ, normMag,
        cr, cg, cb, ca;

    // work in world coords
    // calculate unit vector in direction of the sun
    sunX = this.lightSource.x;
    sunY = this.lightSource.y;
    sunZ = this.lightSource.z;
    sunMag = Math.sqrt(sunX*sunX + sunY*sunY + sunZ*sunZ);
    sunX /= sunMag;
    sunY /= sunMag;
    sunZ /= sunMag;
    // calc unit vector normal to the panel front
    normX = obj.normal.tx-obj.centroid.tx;
    normY = obj.normal.ty-obj.centroid.ty;
    normZ = obj.normal.tz-obj.centroid.tz;
    normMag = Math.sqrt(normX*normX + normY*normY + normZ*normZ);
    normX /= normMag;
    normY /= normMag;
    normZ /= normMag;
    // luminence is dot product of panel's normal and sun vector
    lum = 0.6*(sunX*normX + sunY*normY + sunZ*normZ); // normalise to range 0..0.7
    lum = Math.abs(lum);   // normal can be up or down (back given same shading)
    lum += 0.4;            // shift range to 0.4..1 (so base level so its not too dark)
    /* Now calculate if we are looking at front or back
       if normal dot product with LOS is +ve its the top, -ve its the bottom
       bottom might get a different colour.
       no need to normalise, just need the sign of dot product */
    if (this.frontFacing(obj))
    {
      col = obj.fillColor || this.paintCol;
      // front will be dark if normal is pointing away from lightSource
      if (normX*sunX + normY*sunY + normZ*sunZ < 0)
      {
        lum = 0.4;
      }
    }
    else
    {
      //  looking at back
      col = obj.backColor || this.backCol;
      // back will be dark if normal (front) is pointing toward the lightSource
      if (normX*sunX + normY*sunY + normZ*sunZ > 0)
      {
        lum = 0.4;
      }
    }
    // calc rgb color based on V5 (component of normal to polygon in direction on POV)
    cr = Math.round(lum*col.r);
    cg = Math.round(lum*col.g);
    cb = Math.round(lum*col.b);
    ca = col.a;

    return "rgba("+cr+","+cg+","+cb+","+ca+")";     // string format 'rgba(r,g,b,a)'
  };

  /* =======================================================================
   * objectOfRevolution3D
   * The profile described by 'path' array of Cgo3D commands will form
   * the profile of an object of revolution. 'path' coordinates will be in
   * world cordinates. An Obj3D of type PATH is made of this profile and rotated
   * by the segment angle about the Y axis, the segment end points are joined
   * to the original profile by circular arcs top and bottom defining a curved
   * panel. These panels form one segment of the shape like a segment of an
   * orange. To get color filling to work, path sections must traversed in a
   * consistant direction, CCW to get the normal pointing out of screen.
   * So one side of the panel must be tranversd backwards. This is OK, as only
   * Bezier curves and straight lines are used in Cgo3D format data.
   * Parameters:
   * path: Array of Cgo3D format commands defining the profile in the X,Y plane
   * xOfs: an offset added to profile x coordinates (correct for SVG origin offset)
   * segments: number of segments into which totalAngle is divided
   * fillColor: HTML format color string
   * bkColor: HTML format color string
   * straight: If true, straight lines used to join segments
   * returns a Group3D.
   * -----------------------------------------------------------------------*/
  Cango3D.prototype.objectOfRevolution3D = function(path, xOfs, segments, fillColor, bkCol, straight)
  {
    /*=========================================================
     * function genSvgArc()
     * Generate the SVG format array for a circular arc with
     * center as start piont (canvas style) convert to SVG style
     * The actual arc will compile to Bezier curves by Cango
     * (these can be rotated in 3D and hold their shape).
     * Assumes Cango coords, y +ve up, angles +ve CCW.
     * The arc center is at cx, cy. Arc starts from startAngle
     * and ends at endAngle. startAngle and endAngle are in
     * degrees. The arc radius is r (in world coords). If
     * antiClockwise is true the arc is traversed ccw, if false
     * it is traversed cw.
     *---------------------------------------------------------*/
    var pathObj = this.compilePath3D(path),
        grp = this.createGroup3D(),
        startX = 0,
        startY = 0,
        endX = 0,
        endY = 0,
        panel, pp1Cmds, panelObj,
        topRim, botRim,
        topRimObj, botRimObj, topRimCmds,
        segs = segments || 6,
        segAng = 360 / segs,           // included angle of each segment
        segRad = segAng*Math.PI/180,
        color = fillColor || this.paintCol.toRGBA(),
        bkColor = bkCol || color,
        i, r,
        st, sp,
        topObj, botObj, topData, botData,
        profile_0, profile_1,
        n, m;

    function genSvgArc(cx, cy, r, startAngle, endAngle, antiClockwise)
    {
      var stRad = startAngle * Math.PI/180,
          edRad = endAngle * Math.PI/180,
          mj = 0.55228475,                 // magic number for drawing circle with 4 Bezier curve
          oy = cy + r*Math.sin(stRad),   // coords of start point for circlular arc with center (cx,cy)
          ox = cx + r*Math.cos(stRad),
          ey = cy + r*Math.sin(edRad),   // coords of end point for circlular arc with center (cx,cy)
          ex = cx + r*Math.cos(edRad),
          ccw = (antiClockwise? 1 : 0),
          delta,
          lrgArc,
          swp,
          svgData;

      swp = 1 - ccw;          // 0=ccw 1=cw   (flipped for this ccw +ve world)
      delta = ccw? edRad - stRad :stRad - edRad;
      if (delta < 0)
      {
        delta += 2*Math.PI;
      }
      if (delta > 2* Math.PI)
      {
        delta -= 2*Math.PI;
      }
      lrgArc = delta > Math.PI? 1: 0;

      // dont try to draw full circle or no circle
      if ((Math.abs(delta) < 0.01) || (Math.abs(delta) > 2*Math.PI-0.01))
      {
        svgData = ["M",cx, cy-r,"C",cx+mj*r, cy-r, cx+r, cy-mj*r, cx+r, cy,
                                    cx+r, cy+mj*r, cx+mj*r, cy+r, cx, cy+r,
                                    cx-mj*r, cy+r, cx-r, cy+mj*r, cx-r, cy,
                                    cx-r, cy-mj*r, cx-mj*r, cy-r, cx, cy-r];
      }
      else
      {
        svgData = ["M", ox, oy, "A", r, r, 0, lrgArc, swp, ex, ey];
      }

      return svgData;
    }

    st = 1;         // which segment to start building from
    sp = pathObj.drawCmds.length;
    // Check if top can be made in a single piece
    if (((pathObj.drawCmds[0].ep.x+xOfs)*this.xscl < 3)&&(pathObj.drawCmds[0].ep.y === pathObj.drawCmds[1].ep.y))
    {
      // make the top
      r = pathObj.drawCmds[1].ep.x;
      if (straight)
      {
        topData = ['M',r,0,0];
        for (i=1; i<segments; i++)
        {
          topData.push('L',r*Math.cos(i*segRad),r*Math.sin(i*segRad),0);
        }
        topData.push('Z');
        topObj = this.compileShape3D(topData, color, bkColor);
      }
      else
      {
        topObj = this.compileShape3D(shapes3D.circle(2*r), color, bkColor);
      }
      // flip over to xz plane
      topObj.rotate(1, 0, 0, -90);
      // lift up to startY
      topObj.translate(0,pathObj.drawCmds[0].ep.y,0);
      grp.addObj(topObj);
      st = 2;  // skip the first section of the profile its done
    }
    // Check if bottom can be made in a single piece
    if (((pathObj.drawCmds[sp-1].ep.x+xOfs)*this.xscl < 3)&&(pathObj.drawCmds[sp-1].ep.y === pathObj.drawCmds[sp-2].ep.y))
    {
      // make the bottom
      r = pathObj.drawCmds[sp-2].ep.x;
      if (straight)
      {
        botData = ['M',r,0,0];
        for (i=1; i<segments; i++)
        {
          botData.push('L',r*Math.cos(i*segRad),r*Math.sin(i*segRad),0);
        }
        botData.push('Z');
        botObj = this.compileShape3D(botData, color, bkColor);
      }
      else
      {
        botObj = this.compileShape3D(shapes3D.circle(2*r), color, bkColor);
      }
      // flip over to xz plane
      botObj.rotate(1, 0, 0, 90);
      // lift up to end Y
      botObj.translate(0,pathObj.drawCmds[sp-1].ep.y,0);
      grp.addObj(botObj);
      sp -= 1;  // skip the last section of the profile its done
    }
    profile_0 = pathObj.dup(); // make a copy
    profile_1 = pathObj.dup(); // two needed (not new reference)
    // move the profile by xOfs, useful for SVG copied profiles
    profile_0.translate(xOfs, 0, 0);
    profile_1.translate(xOfs, 0, 0);
    // now this profile must be rotated by the segment angle to form the other side
    profile_1.rotate(0, 1, 0, segAng);   // rotate segment by segAng out of screen
    for (n=0; n<segs; n++)
    {
      for (m=st; m<sp; m++)
      {
        // construct a panel from top and bottom arcs and 2 copies of profile segment
        if (profile_0.drawCmds[m-1].ep.x*this.xscl < 3)   // truncate to 1st Quadrant
        {
          profile_0.drawCmds[m-1].ep.x = 0;
          profile_1.drawCmds[m-1].ep.x = 0;
        }
        startX = profile_0.drawCmds[m-1].ep.x;
        startY = profile_0.drawCmds[m-1].ep.y;
        endX = profile_0.drawCmds[m].ep.x;
        endY = profile_0.drawCmds[m].ep.y;
        if (startX*this.xscl >= 3) // make a topRim if profile doesn't start at center
        {
          // top rim (drawn in xy), endpoint will be where this profile slice starts
          if (straight)
          {
            topRim = ['M',startX*Math.cos(segRad),startX*Math.sin(segRad), 'L',startX,0];
          }
          else
          {
            topRim = genSvgArc(0, 0, startX, segAng, 0, 0);  // generate SVG cmds for top arc
          }
          // shove them into an object to enable rotate and translate
          topRimObj = this.compilePath3D(svgToCgo3D(topRim), color);
          // topRim is in xy plane must be rotated to be in xz plane to join profile
          topRimObj.rotate(1, 0, 0, -90);      // flip top out of screen
          topRimObj.translate(0, startY, 0);   // move up from y=0 to top of profile slice
          // use topRim drawCmds to start the panel array of DrawCmd3Ds
          panel = topRimObj.drawCmds;
        }
        else
        {
          // construct a moveTo command from end point of last command
          topRimCmds = new DrawCmd3D("moveTo", [], profile_0.drawCmds[m-1].ep);
          panel = [topRimCmds];     // use this to start the panel DrawCmd3Ds array
        }
        // push this profile_0 segment DrawCmd3D into panel array
        panel.push(profile_0.drawCmds[m]);
        if (endX > 3)  // make the bottom rim if it has any size
        {
          if (straight)
          {
            botRim = ['M',endX,0, 'L',endX*Math.cos(-segRad),endX*Math.sin(-segRad)];
          }
          else
          {
            botRim = genSvgArc(0, 0, endX, 0, -segAng, 0);
          }
          // shove them into an object to enable rotate and translate
          botRimObj = this.compilePath3D(svgToCgo3D(botRim), color);
          // rim is in xy plane rotate to be in xz plane
          botRimObj.rotate(1, 0, 0, 90);      // flip bottom up to be out of screen
          botRimObj.translate(0, endY, 0);    // move down from y=0 to bottom of profile
          // now this is an moveTo and a bezierCurveTo, drop the 'moveTo'
          panel.push(botRimObj.drawCmds[1]);  // only 1 Bezier here
        }
        // construct a DrawCmd3D going backward up profile_1
        pp1Cmds = new DrawCmd3D(profile_1.drawCmds[m].drawFn.slice(0), [], profile_1.drawCmds[m-1].ep);
        if (profile_1.drawCmds[m].cPts.length === 1)
        {
          pp1Cmds.cPts.push(profile_1.drawCmds[m].cPts[0]);
        }
        // change order of cPts if its a Cubic Bezier
        if (profile_1.drawCmds[m].cPts.length === 2)
        {
          pp1Cmds.cPts.push(profile_1.drawCmds[m].cPts[1]);
          pp1Cmds.cPts.push(profile_1.drawCmds[m].cPts[0]);
        }
        panel.push(pp1Cmds);  // now add retrace path to the panel commands
        // make an Obj3D for this panel
        panelObj = new Obj3D(drawCmd3DToCgo3D(panel), "SHAPE", {"fillColor":color, "backColor":bkColor});
        // now add the complete panel to the array which makes the final shape
        grp.addObj(panelObj);
      }
      // rotate the previously made panels out of the way of next segment
      grp.rotate(0, 1, 0, segAng);
    }

    return grp;
  };

  svgToCgo3D = svgParser.svg2cgo3D;
  cgo3DtoDrawCmd3D = svgParser.cgo3DtoDrawcmd;
}());

