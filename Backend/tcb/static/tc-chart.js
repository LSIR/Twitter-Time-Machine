let charts = {}

const MAX_DATAPOINTS = 800

function getWidthSafe(elem, parentID) {
	let element = $(elem).clone();
	element.css({ visibility: 'hidden' });
	$(parentID).append(element);
	let width = element.outerWidth();
	element.remove();
	return width;
}

function mod(n, m) {
	return ((n % m) + m) % m;
}  


function tcMakeHistoryChart(divID, raw_data, metric, highlighted_points, click_function, ylabel, hover_html) {

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
		.setData(optimizePoints(history, MAX_DATAPOINTS, highlighted_points))
		.setFilled(true)
		.setMargin(40,40,60,0)
		.setXAxisScale(TIME_SCALE)
		.setXAxisScaleDomain(SCALE_EXTENT)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_EXTENT)
		.setHoverEvent(
			function(d) {		
				div.transition()		
					.duration(200)		
					.style("opacity", .9);		
				div.html(d.y +'<br/>'+formatTime(d.x)+'<br/>'+hover_html(d))	
					.style("left", (d3.event.pageX) + "px")		
					.style("top", (d3.event.pageY - 28) + "px");	
			}
		)
		.setOutEvent(
			function(d) {		
				div.transition()		
					.duration(200)		
					.style("opacity", 0);	
			}
		)
		.setClickEvent(click_function)
		.setHighlightedPoints(highlighted_points)
		.setXLabel("Time")
		.setYLabel(ylabel)
		.build(getWidthSafe($(divID), "#myTabContent"), $(divID).height());
	
	let safeDivID = divID.substr(1);
	$(divID+"_row").append('<div class="row col-12 mt-3" id="'+safeDivID+'_controls"></div>')
	let controlRow = $(divID+'_controls')
	controlRow.append('<div class="col-3 form-switch">\
				<label class="form-check-label" for="logscale_'+safeDivID+'">Log scale</label>\
				<input class="form-check-input" type="checkbox" id="logscale_'+safeDivID+'" style="margin-left: 0">\
				</div>')
	controlRow.append('<div class="col-3 form-switch">\
				<label class="form-check-label" for="optimize_'+safeDivID+'">Optimize Points</label>\
				<input class="form-check-input" type="checkbox" id="optimize_'+safeDivID+'" style="margin-left: 0" '+(history.length <= MAX_DATAPOINTS ? "disabled" : "checked")+'>\
				</div>')
	let minDate = new Date(history[0].x).yyyymmdd()
	let maxDate = new Date(history[history.length-1].x).yyyymmdd();
	controlRow.append('<div class="col-3">\
							<label for="start'+safeDivID+'">Start Date</label>\
							<input type="date" id="start'+safeDivID+'" value="'+minDate+'" min="'+minDate+'" max="'+maxDate+'">\
						</div>')
	controlRow.append('<div class="col-3">\
							<label for="end'+safeDivID+'">End Date</label>\
							<input type="date" id="end'+safeDivID+'" value="'+maxDate+'" min="'+minDate+'" max="'+maxDate+'">\
						</div>')

	$('#logscale_'+safeDivID).on('click', function() {
		if($('#logscale_'+safeDivID).prop('checked')) {
			chart.setLogscale('y', true, SCALE_EXTENT);
		} else {
			chart.setLogscale('y', false, SCALE_EXTENT);
		}
	});

	function updateChart(data) {
		if($('#optimize_'+safeDivID).prop('checked')) {
			data = optimizePoints(data, MAX_DATAPOINTS, highlighted_points);
		}
		chart.updateData(data, SCALE_EXTENT, SCALE_EXTENT, 0);
	}

	function dateFilter(data) {
		let startDate = new Date($('#start'+safeDivID).val()).getTime();
		let endDate = new Date($('#end'+safeDivID).val()).getTime();
		let nd = history.filter(e => e.x >= startDate && e.x <= endDate);
		return nd;
	}

	$('#start'+safeDivID).on('change', function() {
		updateChart(dateFilter(history));
	})
	$('#end'+safeDivID).on('change', function() {
		updateChart(dateFilter(history));
	})
	$('#optimize_'+safeDivID).on('change', function() {
		updateChart(dateFilter(history));
	})
}

function tcMakeDailyBarchart(divID, raw_data) {
	let data = [
		{x: "00", y: 0}, {x: "1", y: 0},{x: "2", y: 0},{x: "3", y: 0},{x: "4", y: 0},{x: "5", y: 0}, {x: "6", y: 0},
		{x: "7", y: 0}, {x: "8", y: 0},{x: "9", y: 0},{x: "10", y: 0},{x: "11", y: 0},{x: "12", y: 0}, {x: "13", y: 0},
		{x: "14", y: 0}, {x: "15", y: 0},{x: "16", y: 0},{x: "17", y: 0},{x: "18", y: 0},{x: "19", y: 0}, {x: "20", y: 0},
		{x: "21", y: 0}, {x: "22", y: 0},{x: "23", y: 0}
	]
	raw_data.forEach(function(e) {
		let date = new Date();
		date.setTime(e.ts*1000);
		let day = date.getUTCHours();
		data[day].y += 1;
	});
	let builder = new TCChartBuilder(BAR_CHART);
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(30,20,30,0)
		.setXAxisScale(BAND_SCALE)
		.setXAxisScaleDomain(SCALE_MAP)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_ZERO_MAX)
		.setXLabel("")
		.setYLabel("# tweets")
		.build(530, 280);
}

function tcMakeSourcesBarchart(divID, raw_data) {
	let sources = {};
	raw_data.forEach(function(e) {
		let source = e.source;
		if(source != undefined) {
			source = source.replace( /(<([^>]+)>)/ig, '');
		} else {
			return;
		}
		if(source in sources) {
			sources[source] += 1;
		} else {
			sources[source] = 1;
		}
	});

	let data = [];
	Object.keys(sources).forEach(e => 
		data.push({y: e, x: sources[e]})
	);
	data = data.sort((a,b) => a.x - b.x);
	let builder = new TCChartBuilder(BAR_CHART);
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(10,60,100,0)
		.setYAxisScale(BAND_SCALE)
		.setYAxisScaleDomain(SCALE_MAP)
		.setXAxisScale(LINEAR_SCALE)
		.setXAxisScaleDomain(SCALE_ZERO_MAX)
		.setYLabel("")
		.setXLabel("# tweets")
		.build(530, 300);
	let tooltip = d3.select("body").append("div")
		.attr("class", "tooltip")
	chart.svg.selectAll("rect")
		.on("mouseover", function() { tooltip.style("opacity", "0.9"); })
		.on("mouseout", function() { tooltip.style("opacity", "0"); })
		.on("mousemove", function(d) {
			if(d != undefined) {
				tooltip.html(d.x)
					.style("left", (d3.event.pageX) + "px")		
					.style("top", (d3.event.pageY - 28) + "px");
			}
		});
}

function tcMakeLevenshteinChart(divID, data, names, screen_names, descriptions) {
	let div = d3.select("body").append("div")	
    	.attr("class", "tooltip")				
    	.style("opacity", 0);
	let builder = new TCChartBuilder(BAR_CHART);
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(50,200,50,20)
		.setXAxisScale(BAND_SCALE)
		.setXAxisScaleDomain(SCALE_MAP)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_ZERO_MAX)
		.setXLabel("")
		.setYLabel("Levenshtein Distance")
		.build(getWidthSafe($(divID), "#myTabContent"), $(divID).height());

	chart.xAxis.selectAll("text")
		.attr("transform", "rotate(-90)")
		.attr("x",-20)
		.attr("y",-7)
		.style("text-anchor", "end");

	chart.svg.selectAll("rect")
		.on("mouseover", function(d) {
			div.transition()		
				.duration(200)		
				.style("opacity", .9);
			
			let ts = Date.parse(d.x)/1000;
			let oldName = "";
			let newName = "";
			names.forEach(function(e, idx) {
				if(idx != 0) {
					if(e.ts == ts) {
						oldName = names[idx-1].name+ '<br/>';
						newName = names[idx].name + '<br/>'
						return;
					}
				}
			});

			let oldSName = "";
			let newSName = "";
			screen_names.forEach(function(e, idx) {
				if(idx != 0) {
					if(e.ts == ts) {
						oldSName = screen_names[idx-1].screen_name+ '<br/>';
						newSName = screen_names[idx].screen_name + '<br/>'
						return;
					}
				}
			});


			let oldDesc = "";
			let newDesc = "";
			descriptions.forEach(function(e, idx) {
				if(idx != 0) {
					if(e.ts == ts) {
						oldDesc = descriptions[idx-1].description + '<br/>';
						newDesc = descriptions[idx].description + '<br/>'
						return;
					}
				}
			});


			let html = ''
			
			if(oldName != "") {
				html += 'Change of name:<br/>'
				html += '<span style="color: red">-';
				html += oldName;
				html += '</span><span style="color: green">+'
				html += newName;
				html += '</span>'
			}

			if(oldSName != "") {
				html += 'Change of screen name:<br/>'
				html += '<span style="color: red">-';
				html += oldSName;
				html += '</span><span style="color: green">+'
				html += newSName;
				html += '</span>'
			}

			if(oldDesc != "") {
				html += 'Change of description:<br/>'
				html += '<span style="color: red">-';
				html += oldDesc;
				html += '</span><span style="color: green">+'
				html += newDesc;
				html += '</span>'
			}
		
				
			div.html(html)	
				.style("left", (d3.event.pageX) + "px")		
				.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			div.transition()		
				.duration(200)		
				.style("opacity", 0);	
		})
}

function tcMakeProfileGradeChart(divID, subgrades_data) {

	let data = [
		{x: subgrades_data[0]*10, y: "Attributes change"},
		{x: subgrades_data[1]*10, y: "Deletions"},
		{x: subgrades_data[2]*2, y: "Follower rise"}
	];

	let builder = new TCChartBuilder(BAR_CHART);
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(10,60,90,10)
		.setYAxisScale(BAND_SCALE)
		.setYAxisScaleDomain(SCALE_MAP)
		.setXAxisScale(LINEAR_SCALE)
		.setXAxisScaleDomain(SCALE_ZERO_MAX)
		.setYLabel("")
		.setXLabel("Penalty")
		.build(530, 250);
}

function tcMakeTypeChart(divID, data) {
	let builder = new TCChartBuilder(BAR_CHART);
	
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(10,80,60,0)
		.setXAxisScale(BAND_SCALE)
		.setXAxisScaleDomain(SCALE_MAP)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_ZERO_MAX)
		.setXLabel("")
		.setYLabel("# tweets")
		.build(530, 300);

	let tooltip = d3.select("body").append("div")
		.attr("class", "tooltip")
	chart.svg.selectAll("rect")
		.on("mouseover", function() { tooltip.style("opacity", "0.9"); })
		.on("mouseout", function() { tooltip.style("opacity", "0"); })
		.on("mousemove", function(d) {
			if(d != undefined) {
				tooltip.html(d.y)
					.style("left", (d3.event.pageX) + "px")		
					.style("top", (d3.event.pageY - 28) + "px");
			}
		});
}