let charts = {}

function tcMakeHistoryChart(divID, raw_data, metric, xaxis, yaxis) {

	let history = raw_data.map((x) => {
		let metrics = x["details"][metric]
		let date = new Date(x["ts"] * 1000)
		return {x: date, y: metrics}
	})

	let builder = new TCChartBuilder(DOTTED_LINE_CHART);
	let div = d3.select("body").append("div")	
    	.attr("class", "tooltip")				
    	.style("opacity", 0);
	let chart = builder
		.setParentDiv($(divID))
		.setData(history)
		.setFilled(true)
		.setMargin(50,50,50,50)
		.setXAxisScale(TIME_SCALE)
		.setXAxisScaleDomain(SCALE_EXTENT)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_ZERO_MAX)
		.setHoverEvent(
			function(d) {		
				div.transition()		
					.duration(200)		
					.style("opacity", .9);		
				div.html(d.y +'<br/>'+formatTime(d.x))	
					.style("left", (d3.event.pageX) + "px")		
					.style("top", (d3.event.pageY - 28) + "px");	
			}
		)
		.setOutEvent(
			function(d) {		
				div.transition()		
					.duration(500)		
					.style("opacity", 0);	
			}
		)
		.build();

	/*
	let jq_div = $(divID)
	let margin = {top: 50, right: 50, bottom: 50, left: 50}
	, width = getWidthSafe(jq_div) - margin.left - margin.right // Use the window's width 
	, height = jq_div.height() - margin.top - margin.bottom; // Use the window's height

	let history = raw_data.map((x) => {
		let metrics = x["details"][metric]
		let date = new Date(x["ts"] * 1000)
		return {x: date, y: metrics}
	})

	let min = d3.min(history.map(e => e.y))
	let max = d3.max(history.map(e => e.y))

	// The number of datapoints
	let n = (history).length
	// 5. X scale will use the index of our data
	let xScale = d3.scaleTime()
		.domain([history[0].x, history[n-1].x]) // input
		.range([0, width]); // output

	// 6. Y scale will use the randomly generate number 
	let yScale = d3.scaleLinear()
		.domain([min, max]) // input 
		.range([height, 0]); // output 

	// 7. d3's line generator
	let line = d3.area()
		.x(function(d) { return xScale(d.x); }) // set the x values for the line generator
		.y1(function(d) { return yScale(d.y); }) // set the y values for the line generator 
		.y0(height)
		.curve(d3.curveMonotoneX) // apply smoothing to the line

	// 8. An array of objects of length N. Each object has key -> value pair, the key being "y" and the value is a random number
	let dataset = history

	// 1. Add the SVG to the page and employ #2
	let svg = d3.select(divID)
		.append("div")
		.classed("svg-container", true)
		.append("svg")
		.attr("preserveAspectRatio", "xMinYMin meet")
		.attr("viewBox", "0 0 "+(width+margin.left)+" "+(height+2*margin.top))
		.classed("svg-content-responsive", true)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");



	//Add background grid
	svg.append("g")
		.attr("class", "grid")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(xScale)
			.tickSize(-height)
			.tickFormat("")
		);

	svg.append("g")
		.attr("class", "grid")
		.call(d3.axisLeft(yScale).ticks(5)
			.tickSize(-width)
			.tickFormat("")
		);

	// 3. Call the x axis in a group tag
	let xAxis = svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(xScale)); // Create an axis component with d3.axisBottom

	// 4. Call the y axis in a group tag
	let yAxis =svg.append("g")
		.attr("class", "y axis")
		.call(d3.axisLeft(yScale).ticks(5)); // Create an axis component with d3.axisLeft

	// 9. Append the path, bind the data, and call the line generator 
	svg.append("path")
		.datum(dataset) // 10. Binds data to the line 
		.attr("class", "line") // Assign a class for styling 
		.attr("d", line); // 11. Calls the line generator 

	let div = d3.select("body").append("div")	
    	.attr("class", "tooltip")				
    	.style("opacity", 0);

	// 12. Appends a circle for each datapoint 
	svg.selectAll(".dot")
		.data(dataset)
	.enter().append("circle") // Uses the enter().append() method
		.attr("class", "dot") // Assign a class for styling
		.attr("cx", function(d) { return xScale(d.x) })
		.attr("cy", function(d) { return yScale(d.y) })
		.attr("r", 4)
		.attr('opacity', 0.3)
		.style('fill', 'blue')
		.on("mouseover", function(d) {		
            div.transition()		
                .duration(200)		
                .style("opacity", .9);		
            div	.html(d.y +'<br/>'+formatTime(d.x))	
                .style("left", (d3.event.pageX) + "px")		
                .style("top", (d3.event.pageY - 28) + "px");	
            })					
        .on("mouseout", function(d) {		
            div.transition()		
                .duration(500)		
                .style("opacity", 0);	
	});

	function setLogscale(logscale) {

		// Get the data again
		history.forEach(function(d) {
				d.x = Math.log10(d.x);
		});

		// Scale the range of the data again 
		xScale.domain(d3.extent(history, function(d) { return Math.log10(d.x); }));
		yScale.domain([0, d3.max(history, function(d) { return d.y; })]);

		// Select the section we want to apply our changes to

		// Make the changes
		svg.select(".line")   // change the line
			.attr("d", line(history));
		svg.select(".x.axis") // change the x axis
			.call(d3.axisBottom(xScale));
		svg.select(".y.axis") // change the y axis
			.call(d3.axisLeft(yScale).ticks(5));

	}

	$(divID+" > .svg-container").append('<div class="row" id="'+divID.substr(1)+'_controls"></div>')
	let controlRow = $(divID+'_controls')
	controlRow.append('<div class="offset-1 col-2 form-switch">\
				<input class="form-check-input" type="checkbox" id="logscale_'+divID+'">\
				<label class="form-check-label" for="logscale_'+divID+'">Logarithmic scale</label>\
				</div>')
	controlRow.append('<div class="col-2 form-switch">\
				<input onchange="optimizePoints(\''+divID+'\', 500)" checked class="form-check-input" type="checkbox" id="optimize_'+divID+'">\
				<label class="form-check-label" for="optimize_'+divID+'">Optimize Points</label>\
				</div>')
	let minDate = new Date(history[history.length-1].x).yyyymmdd()
	let maxDate = new Date(history[0].x).yyyymmdd();
	controlRow.append('<div class="col-3">\
							<label for="start'+divID+'">Start Date</label>\
							<input onchange="optimizePoints(\''+divID+'\', 500)" type="date" id="start'+divID+'" value="'+minDate+'" min="'+minDate+'" max="'+maxDate+'">\
						</div>')
	controlRow.append('<div class="col-3">\
							<label for="end'+divID+'">End Date</label>\
							<input onchange="optimizePoints(\''+divID+'\', 500)" type="date" id="end'+divID+'" value="'+maxDate+'" min="'+minDate+'" max="'+maxDate+'">\
						</div>')

	$('logscale_'+divID).on('click', setLogscale(true));
	*/
}

	