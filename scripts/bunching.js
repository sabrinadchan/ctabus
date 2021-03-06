(function() {

  var pi = Math.PI,
      tau = 2 * pi;

  var width, height, fullWidth, fullHeight;

  var color = d3.scaleSequential(d3.interpolateMagma);

  var maxBunching;

  var smallProjection = d3.geoMercator(),
      bigProjection = d3.geoMercator();

  var path = d3.geoPath();

  var fullViz = d3.select("#bunching");

  var legendWidth = 100;

  var legendY = d3.scaleLinear()
      .domain([0, legendWidth]);

  var inverseLegendY = d3.scaleLinear()
      .range([0, legendWidth]);

  var tooltip = d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("visibility", "hidden");

  function setUnitProjection(projection) {
    projection
      .scale(1 / tau)
      .translate([0, 0]);
  }

  function updateRouteBunching() {
    d3.selectAll("#bunching svg").remove();

    setUnitProjection(smallProjection);
    setUnitProjection(bigProjection);

    var rt = document.getElementById("route-select").value,
        neg = rtInfo[rt].neg,
        pos = rtInfo[rt].pos,
        pidNeg = rtInfo[rt].pidNeg;
        pidPos = rtInfo[rt].pidPos,

    d3.queue()
        .defer(d3.json, "data/project_page/geometry/" + rt + "_" + pidNeg + ".topojson")
        .defer(d3.json, "data/project_page/bunching/" + rt + "_" + neg + "_bunching.json")
        .defer(d3.json, "data/project_page/geometry/" + rt + "_" + pidPos + ".topojson")
        .defer(d3.json, "data/project_page/bunching/" + rt + "_" + pos + "_bunching.json")
        .await(ready);
  }

  routeSelect.on("change.bunching", updateRouteBunching);

  function ready(error, rtNeg, bunchingNeg, rtPos, bunchingPos) {
    if (error) throw error;

    var bbox = path.projection(smallProjection).bounds(topojson.feature(rtPos, rtPos.objects.stops));

    var deltaX = bbox[1][0] - bbox[0][0];
    var deltaY = bbox[1][1] - bbox[0][1];
    var vertical = Math.abs(deltaX * 2) < deltaY;

    if (vertical) {
      width = 75;
      height = 150;
      fullWidth = 4 * width,
      fullHeight = 4 * (height + 20);

      var smallMultiples = fullViz.append("svg")
          .attr("class", "small-multiples")
          .attr("width", width)
          .attr("height", fullHeight);
    } else {
      width = 150;
      height = 75;
      fullWidth = 4 * width,
      fullHeight = 4 * height;

      var smallMultiples = fullViz.append("svg")
          .attr("class", "small-multiples")
          .attr("width", fullWidth)
          .attr("height", height + 20);
    }

    // pre-filter data
    var rt = document.getElementById("route-select").value
    bunchingNeg = bunchingNeg.filter(b => b.terminal == "wait|" + rtInfo[rt].stpidTerminalNeg);
    bunchingPos = bunchingPos.filter(b => b.terminal == "wait|" + rtInfo[rt].stpidTerminalPos);

    smallMultiples.selectAll(".small-map-group")
        .data(bunchingPos)
      .enter().append("g")
        .attr("class", (_, i) => "small-map-group" + (i ? " sm-inactive" : " sm-active"))
        .attr("width", width)
        .attr("height", height + 20)
        .attr("transform", (_, i) => "translate(" + (vertical ? 0 : i * width) + "," + (vertical ? i * (height + 20) : 0) + ")")
      .append("svg")
        .attr("class", "small-map")
        .attr("width", width)
        .attr("height", height)
        .each(function (d) {
          drawMap(bbox, width, height, smallProjection, d3.select(this));
        })

    var bigMap = fullViz.append("svg")
          .attr("id", "fullmap")
          .attr("width", fullWidth)
          .attr("height", fullHeight)
          .attr("transform", "translate(" + (vertical ? width : 0) + ",0)");

    drawMap(bbox, fullWidth, fullHeight, bigProjection, bigMap);

    if (vertical) {
      var buttonPos = drawTextButton(bigMap, 30, 30, "<tspan>&#8593</tspan><tspan dx='-1em' dy='1.2em'>NB</tspan>", "bold 16px sans-serif");
      var buttonNeg = drawTextButton(bigMap, 30, fullHeight - 30, "<tspan dx='-0.5em'>SB</tspan><tspan dx='-1em' dy='0.9em'>&#8595</tspan>", "bold 16px sans-serif");
    } else {
      var buttonPos = drawTextButton(bigMap, fullWidth - 30, fullHeight - 10, "EB &#8594", "bold 16px sans-serif");
      var buttonNeg = drawTextButton(bigMap, 30, fullHeight - 10, "&#8592 WB", "bold 16px sans-serif");
    }   
    
    buttonNeg
        .attr("class", "update-inactive")
        .on("click", function (d) {
          if(!d3.select(this).classed("update-active")) {
            update(bunchingNeg, rtNeg);
            toggleClasses("update-active", "update-inactive", d3.select(this));
          }
        });

    buttonPos
        .attr("class", "update-active")
        .on("click", function (d) {
          if(!d3.select(this).classed("update-active")) {
            update(bunchingPos, rtPos);
            toggleClasses("update-active", "update-inactive", d3.select(this));
          }
        });

    update(bunchingPos, rtPos)
  }

  function drawMap(b, width, height, projection, svg) {
    var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
        t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

    var tiles = d3.tile()
        .size([width, height])
        .scale(s)
        .translate([t[0], t[1]])
        ();

    projection
        .scale(s / tau)
        .translate([t[0], t[1]]);

    var map = svg.append("g")
      .selectAll("image").data(tiles).enter().append("image")
        .attr("xlink:href", d => "http://" + "abc"[d[1] % 3] + ".basemaps.cartocdn.com/light_all/" + d[2] + "/" + d[0] + "/" + d[1] + ".png")
        .attr("x", d => (d[0] + tiles.translate[0]) * tiles.scale)
        .attr("y", d => (d[1] + tiles.translate[1]) * tiles.scale)
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);

    return map;
  }

  function drawSmallMultiples(geometry, projection) {
    d3.selectAll(".small-map-group")
        .append("g")
        .attr("class", "small-multiple-info")
        .each(function(d) {
          var route = drawRoute(d3.select(this), d, geometry, projection);
          route.attr("stroke-width", 2)
          var button = drawTextButton(d3.select(this), width / 2, height + 15, d.time_of_day, "bold 12px sans-serif");
        })
  }

  function drawTextButton(svg, x, y, text, font) {
    var button = svg.append("g");
    var rectLayer = button.append("g");
    var textLayer = button.append("g");

    var text = textLayer.append("text")
        .attr("text-anchor", "middle")
        .attr("x", x)
        .attr("y", y)
        .style("font", font)
        .html(text)
        .style("cursor", "pointer");

    var textBBox = text.node().getBBox();

    var rect = rectLayer.append("rect")
        .attr("class", "textbox")
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("x", textBBox.x - 2)
        .attr("y", textBBox.y - 1)
        .attr("width", textBBox.width + 4)
        .attr("height", textBBox.height + 2)
        .attr("fill", "#bbb");

    return button;
  }

  function drawFigure(data, geometry, projection) {
    var svg = d3.select("#fullmap")
    svg = svg.append("g").attr("class", "big-figure");

    var route = drawRoute(svg, data, geometry, projection);

    route.attr("class", "big-map-path")
        .attr("stroke-width", 5)
        .on("mouseover", function (d) {
          showToolTip(this, d, data);
        })
        .on("mouseout", function (d) {
          d3.select(this).attr("stroke-width", 5);
          tooltip.style("visibility", "hidden");
        })

    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20," + (height - 50) + ")");

    inverseLegendY.domain(color.domain());
    legendY.range(color.domain());

    var legendAxisArea = legend.append("g")
        .attr("class", "axis axis--y")
        .attr("transform", "translate(0,15)")

    var legendAxis = d3.axisBottom()
      .scale(inverseLegendY)
      .tickValues([0, maxBunching / 2, maxBunching])
      .tickSize(3)
      .tickFormat(d3.format(".0%"))

    legendAxisArea.call(legendAxis);

    legend.selectAll(".bands")
        .data(d3.range(legendWidth), d => d)
      .enter().append("rect")
        .attr("x", d => d)
        .attr("y", 10)
        .attr("width", 1)
        .attr("height", 5)
        .attr("fill", d => color(legendY(d)));
  }

  function drawRoute(svg, data, geometry, projection) {
    var route = svg.selectAll(".stops")
        .data(topojson.feature(geometry, geometry.objects.stops).features)
      .enter().append("path")
        .attr("d", path.projection(projection))
        .attr("fill", "none")
        .attr("stroke", d => color(data.values[d.properties.stpid].proportion))
        .attr("pointer-events", "visibleStroke");

    return route;
  }

  function toggleClasses(a, b, e) {
    d3.selectAll("." + a).classed(a, false).classed(b, true);
    e.classed(a, true).classed(b, false);
  }

  function showToolTip(self, d, data) {
    d3.select(self).attr("stroke-width", 7);
    tooltip.style("visibility", "visible")
        .html(d.properties.stpnm + "<br />" + data.values[d.properties.stpid].count + " incidents, " + d3.format(".0%")(data.values[d.properties.stpid].proportion) + " of trips");

    var tip = document.getElementById("tooltip")
    var tipw = tip.offsetWidth
    var tiph = tip.offsetHeight

    var bbox = self.getBBox();
    var matrix = self.getScreenCTM();
    var svg = document.getElementById("fullmap");
    var pt = svg.createSVGPoint();
    pt.x = bbox.x  + window.scrollX + (bbox.width / 2) - (tipw / 2);
    pt.y = bbox.y - tiph + window.scrollY;
    var trans = pt.matrixTransform(matrix);

    tooltip
        .style("left", (trans.x) + "px")   
        .style("top", (trans.y - 10) +  "px");
  }

  function updateColorScale(data) {
    maxBunching = d3.max(data, b => d3.max(Object.values(b.values).map(v => v.proportion)));
    color.domain([0, maxBunching]);
  }

  function updateColor(data) {
    d3.selectAll(".big-map-path")
        .attr("stroke", d => color(data.values[d.properties.stpid].proportion));
  }

  function update(data, geometry) {
    d3.selectAll(".big-figure").remove();
    d3.selectAll(".small-multiple-info").remove();
    updateColorScale(data);

    var smallMultiples = d3.selectAll(".small-map-group");
    smallMultiples.data(data).exit();
    drawSmallMultiples(geometry, smallProjection);
    drawFigure(data[0], geometry, bigProjection);

    toggleClasses("sm-active", "sm-inactive", d3.select(d3.selectAll(".small-map-group").nodes()[0]));

    d3.selectAll(".small-map-group")
      .on("click", function(d) {
        if(!d3.select(this).classed("sm-active")) {
          toggleClasses("sm-active", "sm-inactive", d3.select(this));
          updateColor(d);
          d3.selectAll(".big-map-path")
            .on("mouseover", function(e) {
              showToolTip(this, e, d);
            })
        }
      });
  }

updateRouteBunching();

})();