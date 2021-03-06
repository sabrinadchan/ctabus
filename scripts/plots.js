(function() {
	  
	var margin = {top: 25, right: 25, bottom: 25, left: 25},
			outerWidth = 500,
			outerHeight = 200,
			width = outerWidth - margin.left - margin.right,
			height = outerHeight - margin.top - margin.bottom;

	var stopList;
	var waitCols = [];

	var defaultValues;

	routeSelect.on("change.plots", updateRoute);

	var formatTimeAxis = d3.timeFormat("%-I%p");
	var formatTimeCaption = d3.timeFormat("%-I:%M%p");
	var parseTime = d3.timeParse("%H %M");

	var x = d3.scaleLinear()
			.range([0, width])
			.domain([0, 23 + 3599 / 3600]);

	var xTime = d3.scaleTime()
			.range([0, width])
			.domain([new Date("2017-01-01 03:00:00"), new Date("2017-01-02 03:00:00")]);

	var yTravel = d3.scaleLinear()
			.range([height, 0]);

	var yWait = d3.scaleLinear()
			.range([height, 0]);

	var yAxisTravel = d3.axisLeft()
			.scale(yTravel)
			.tickSize(-width, 0)
			.tickSizeOuter(0);

	var yAxisWait = d3.axisLeft()
			.scale(yWait)
			.tickSize(-width, 0)
			.tickSizeOuter(0);

	var lineTravel = d3.line()
			.curve(d3.curveBasis)
			.defined(d => d)
			.x(d => x(mod(d.x - 3, 24)))
			.y(d => yTravel(d.y));

	var lineWait = d3.line()
			.curve(d3.curveBasis)
			.defined(d => d)
			.x(d => x(mod(d.x - 3, 24)))
			.y(d => yWait(d.y));

	// creates title and caption
	var title = d3.select("#title").append("text")
			.style("font-size", "16px")
			.style("font-weight", "bold");

	var caption = d3.select("#caption").append("text")
			.style("font-size", "12px");

	// creates plot of travel times
	var travelPlot = d3.select("div#travelPlot").append("svg")
			.attr("height", outerHeight)
			.attr("width", outerWidth)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	travelPlot.append("g")
			.attr("class", "major")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(xTime).ticks(24));

	travelPlot.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(xTime).tickFormat(formatTimeAxis));

	travelPlot.append("g")
			.attr("class", "axis axisTravel--y")
			.call(d3.axisLeft(yTravel))
		.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", "0.71em")
			.attr("fill", "black")
			.text("Travel Time (min)");

	// creates plot of wait times
	var waitPlot = d3.select("div#waitPlot").append("svg")
			.attr("height", outerHeight)
			.attr("width", outerWidth)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + 10 + ")");

	waitPlot.append("g")
			.attr("class", "major")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(xTime).ticks(24));

	waitPlot.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(xTime).tickFormat(formatTimeAxis));

	waitPlot.append("g")
			.attr("class", "axis axisWait--y")
			.call(d3.axisLeft(yWait))
		.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", "0.71em")
			.attr("fill", "black")
			.text("Wait Time (min)");

	function updateRoute() {
		var rt = document.getElementById("route-select").value;

		// loads list of bus stops and populates dropdown menus
		 d3.queue()
	      .defer(d3.json, "data/project_page/stop_lists/" + rt + "_stop_list.json")
	      .defer(d3.json, "data/project_page/defaults/" + rt + "_defaults.json")
	      .await(ready);

		function ready(error, stops, defaults) {
			if (error) throw error;

			stopList = stops;
			defaultValues = defaults.plotjsdefs;

			// creates each dropdown menu
			var select = d3.select("#direction-select")
				.selectAll(".rtdir-option")
					.data(Object.keys(stopList), d => d)

			select.exit().remove()

			select.enter().append("option")
					.attr("class", "rtdir-option")
					.attr("value", d => d)
					.text(d => d);

			d3.select("#day-select")
				.selectAll("option")
					.data(["All days", "Weekdays", "Saturdays", "Sundays"])
				.enter()
					.append("option")
					.attr("value", d => d)
					.text(d => d);

			// data is list of integers 0 to 23 (i.e. 24 hours)
			d3.select("#hour-select")
				.selectAll("option")
					.data(Array(24).fill().map((_, i) => i))
				.enter().append("option")
					.attr("value", d => d)
					.text(d => d);

			// data is list of integers 0 to 59 (i.e. 60 minutes)
			d3.select("#minute-select")
				.selectAll("option")
					.data(Array(60).fill().map((_, i) => i))
				.enter().append("option")
					.attr("value", d => d)
					.text(d => d);

			updateDropdownValues(stops, defaultValues.direction);

			var directionDropDown = d3.select("#direction-select");
			var originDropDown = d3.select("#origin-select");
			var destinationDropDown = d3.select("#destination-select");
			var hourSelect = d3.select("#hour-select");
			var minuteSelect = d3.select("#minute-select");

			// assigns each dropdown menu a default value
			directionDropDown.property("value", defaultValues.direction);
			originDropDown.property("value", defaultValues.origin);
			destinationDropDown.property("value", defaultValues.destination);
			hourSelect.property("value", defaultValues.hour);
			minuteSelect.property("value", defaultValues.minute);

			// update origin and destination options on route direction change
			directionDropDown.on("change", () => {
				updateDropdownValues(stops, d3.event.target.value);
			})

			updatePlots();
		}
	}

	function updateDropdownValues(data, rtdir) {
		var originDropDown = d3.select("#origin-select");
		var destinationDropDown = d3.select("#destination-select");
		originDropDown.selectAll("option").remove();
		destinationDropDown.selectAll("option").remove();

		// creates each dropdown menu
		originDropDown
			.selectAll("option")
				.data(data[rtdir])
			.enter().append("option")
				.attr("value", d => d.stpid)
				.attr("class", "origin-stops")
				.attr("id", (_, i) => "origin-" + i)
				.text(d => d.stpnm);

		destinationDropDown
			.selectAll("option")
				.data(data[rtdir])
			.enter().append("option")
				.attr("value", d => d.stpid)
				.attr("class", "destination-stops")
				.attr("id", (_, i) => "destination-" + i)
				.text(d => d.stpnm);

		var originSelect = originDropDown.node()
		var destinationSelect = destinationDropDown.node()
		originSelect.selectedIndex = 0;
		destinationSelect.selectedIndex = originSelect.options.length - 1;

		/**
		 * hides default destination bus stop from origin drop down and vice versa 
		 * note: this is important! user shouldn't be able to select the same origin and destination
		 * stops since the bus doesn't move! 
		 */

		originDropDown.select("#origin-" + (originSelect.options.length - 1))
				.classed("origin-always-hidden", true)
				.attr("hidden", true);

		destinationDropDown.select("#destination-0")
				.classed("destination-always-hidden", true)
				.attr("hidden", true);

		// when origin selection changes, hides invalid selections from destination dropdown
		originDropDown.on("change", () => {
			destinationDropDown.selectAll(".destination-hidden")
					.classed("destination-hidden", false)
					.attr("hidden", null);

			if (d3.event.target.selectedIndex >= destinationSelect.selectedIndex) {
				destinationDropDown.node().selectedIndex =	d3.event.target.selectedIndex + 1
			}

			for (i = 0; i <= d3.event.target.selectedIndex; i++) {
				destinationDropDown.select("#destination-" + i)
					.classed("destination-hidden", true)
					.attr("hidden", true);
			}
		});
	}

	/**
	 * Runs on page load and after user presses submit button
	 * Loads trip and wait time data and renders corresponding plots
	 */
	function updatePlots() {
		// collects input from dropdown menus
		var rt = document.getElementById("route-select").value;
		var direction = d3.select("#direction-select").node().value;
		var originSelect = d3.select("#origin-select").node();
		var origin = originSelect.value;
		var originText = originSelect.options[originSelect.selectedIndex].text;
		var destinationSelect = d3.select("#destination-select").node();
		var destination = destinationSelect.value;
		var destinationText = destinationSelect.options[destinationSelect.selectedIndex].text;
		var day = d3.select("#day-select").node().value;
		var hour = parseInt(d3.select("#hour-select").node().value);
		var minute = parseInt(d3.select("#minute-select").node().value);

		// clears plots
		d3.selectAll("circle.scatter").remove();
		d3.selectAll("rect.timeband").remove();
		d3.selectAll("path.median").remove();

		// changes opacity of title, caption, and plots while loading data
		title.classed("loading", true);
		caption.classed("loading", true);
		travelPlot.classed("loading", true);
		waitPlot.classed("loading", true);
		
		/**
		 * FIXME: when data re-processed, distinguish only between weekday, Saturday, or Sunday
		 * note: each number represents a day of the week: 0 = Monday, ..., 6 = Sunday
		 */
		var startDay, endDay;
		if (day == "All days") {                        
			startDay = 0;
			endDay = 6;
		} else if (day == "Weekdays") {
			startDay = 0;
			endDay = 4;
		} else if (day == "Saturdays") {
			startDay = 5;
			endDay = 5;
		} else { 
			startDay = 6;
			endDay = 6;
		}
		
		// Load trip and wait time data
		var dataPath = "data/project_page/travels_waits/" + rt  + "/" + rt + "_" + direction.toLowerCase() + "_201905_" + origin + "_tw.csv";
		d3.csv(dataPath, type, function(error, data) {

			// filters data based on dropdown selections
			var filtered = data.filter((d) => (
				(d.origin == origin && d.destination == destination) &&
				(startDay <= d.day_of_week && d.day_of_week <= endDay)
			));
			
			// initialize array of 15-minute bins (4 bins for each hour) for trip and wait times
			const BINS_PER_HR = 2;
			var binnedTrips = Array.apply(null, Array(24 * BINS_PER_HR)).map(a => []);
			var binnedWaits = Array.apply(null, Array(24 * BINS_PER_HR)).map(a => []);

			// choose correct wait times column to use
			var stopArray = stopList[direction].map(x => x.stpid);
			var destinationIndex = stopArray.indexOf(+destination);
			var waitIndicies = waitCols.map(x => stopArray.indexOf(+x)).sort((a, b) => a - b);
			waitIndicies = waitIndicies.filter(x => x >= destinationIndex);
			var waitIndex = d3.min(waitIndicies);
			var wait_time = stopArray[waitIndex];

			// sorts data into appropriate bins so that statistics can be computed over each bin
			filtered.forEach((a) => {
				var i = Math.floor(a.decimal_time) * BINS_PER_HR + Math.floor(+a.decimal_time.split(".")[1] / (100 / BINS_PER_HR));
				binnedTrips[i].push(a.travel_time);
				binnedWaits[i].push(a[wait_time]);
			});

			/** 
			 * calculates median travel and wait time over each 15-minute interval and
			 * stores data as array of points {x: decimal time, y: median value} OR
			 * nulls if median isn't defined over a particular 15-min interval.
			 * note: median isn't defined if there are no recorded bus trips departing
			 * the origin stop on that interval
			 */
			var travelMedian = binnedTrips.map((a, i) => {
				var median = d3.median(a);
				return {x: i / BINS_PER_HR, y: median ? median : null};
			});
			var waitMedian = binnedWaits.map((a, i) => {
				var median = d3.median(a);
				return {x: i / BINS_PER_HR, y: median ? median : null};
			});
			console.log(travelMedian)
			console.log(waitMedian)

			travelMedian = travelMedian.sort((a, b) => mod(a.x - 3, 24) - mod(b.x - 3, 24)).map(a => a.y ? a : null)
			waitMedian = waitMedian.sort((a, b) => mod(a.x - 3, 24) - mod(b.x - 3, 24)).map(a => a.y ? a : null)

			// updates title and caption
			title.text(originText + " -> " + destinationText + " (" + day + ")");

			var timeIndex = (mod(hour - 3, 24) * BINS_PER_HR) + Math.floor(minute / (60 / BINS_PER_HR));
			if (!waitMedian[timeIndex]) {
				caption.text("At " + formatTimeCaption(parseTime(hour + " " + minute)) +
					" there are no " + rtInfo[rt].rtno + " " + rtInfo[rt].rtnm + " buses leaving from " + originText +
					" going to " + destinationText + ".");
			} else {
				caption.text("At " + formatTimeCaption(parseTime(hour + " " + minute)) + 
					" the " + rtInfo[rt].rtno + " " + rtInfo[rt].rtnm + " bus leaves approximately every " + waitMedian[timeIndex].y.toFixed(1) +
					" minutes from " + originText + " going to " + destinationText + "." +
					" The trip takes around " + travelMedian[timeIndex].y.toFixed(1) + " minutes.");
			}

			// finds reasonable domain for plots: [0, 1.5 times the trip/wait time at 90th percentile]
			yTravel.domain(
				[0, d3.quantile(filtered.map(a => a.travel_time).sort((a, b) => a - b), 0.9) * 1.5]
			);
			yWait.domain(
				[0, d3.quantile(filtered.map(a => a[wait_time]).sort((a, b) => a - b), 0.9) * 1.5]
			);

			// updates plot of travel times
			d3.select("g.axisTravel--y")
					.call(d3.axisLeft(yTravel));

			travelPlot.selectAll("circle")
					.data(filtered)
				.enter().append("circle")
					.attr("class", "scatter")
					.attr("cx", d => x(mod(+d.decimal_time - 3 , 24)))
					.attr("cy", d => yTravel(d.travel_time))
					.attr("r", "0.5px");

			travelPlot.append("path")
					.attr("class", "median")
					.attr("d", lineTravel(travelMedian));

			travelPlot.append("rect")
					.attr("class", "timeband")
					.attr("x", x(mod(hour + (Math.floor(minute / (60 / BINS_PER_HR)) / BINS_PER_HR) - 3 , 24)))
					.attr("y", 0)
					.attr("width", x(1 / BINS_PER_HR))
					.attr("height", height);

			// updates plot of wait times
			d3.select("g.axisWait--y")
					.call(d3.axisLeft(yWait));

			waitPlot.selectAll("circle")
					.data(filtered)
				.enter().append("circle")
					.attr("class", "scatter")
					.attr("cx", d => x(mod(+d.decimal_time - 3 , 24)))
					.attr("cy", d => yWait(d[wait_time]))
					.attr("r", "0.5px");
			
			waitPlot.append("path")
					.attr("class", "median")
					.attr("d", lineWait(waitMedian));

			waitPlot.append("rect")
					.attr("class", "timeband")
					.attr("x", x(mod(hour + (Math.floor(minute / (60 / BINS_PER_HR)) / BINS_PER_HR) - 3 , 24)))
					.attr("y", 0)
					.attr("width", x(1 / BINS_PER_HR))
					.attr("height", height);

			title.classed("loading", false);
			caption.classed("loading", false);
			travelPlot.classed("loading", false);
			waitPlot.classed("loading", false);
		});
	}

	function type(d, i) {
		if (!i) {
			for (var w in d) {
		    if (/^wait\|/.test(w)) {
		      waitCols.push(+w.split("|")[1]);
		    }
		  }
		}

		d.day_of_week = +d.day_of_week;
		d.decimal_time = (+d.decimal_time).toFixed(2);
		d.travel_time = +d.travel_time;
		waitCols.forEach(w => d[w] = +d["wait|"+w]);

		return d;
	}

	d3.select("#submit").on("click", updatePlots);
	updateRoute();

})();