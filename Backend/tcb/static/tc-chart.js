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


function tcMakeHistoryChart(divID, raw_data, metric, highlighted_points, click_function) {

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
		.setData(optimizePoints(history, MAX_DATAPOINTS, []))
		.setFilled(true)
		.setMargin(50,50,50,0)
		.setXAxisScale(TIME_SCALE)
		.setXAxisScaleDomain(SCALE_EXTENT)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_EXTENT)
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
					.duration(200)		
					.style("opacity", 0);	
			}
		)
		.setClickEvent(click_function)
		.setHighlightedPoints(highlighted_points)
		.build(getWidthSafe($(divID), "#myTabContent"), $(divID).height());
	
	let safeDivID = divID.substr(1);
	$(divID+"_row").append('<div class="row col-8 mt-3" id="'+safeDivID+'_controls"></div>')
	let controlRow = $(divID+'_controls')
	controlRow.append('<div class="col-3 form-switch">\
				<label class="form-check-label" for="logscale_'+safeDivID+'">Logarithmic scale</label>\
				<input class="form-check-input" type="checkbox" id="logscale_'+safeDivID+'" style="margin-left: 0">\
				</div>')
	controlRow.append('<div class="col-3 form-switch">\
				<label class="form-check-label" for="optimize_'+safeDivID+'">Optimize Points</label>\
				<input checked class="form-check-input" type="checkbox" id="optimize_'+safeDivID+'" style="margin-left: 0">\
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
			//chart.updateData(history.map(e => ({y: Math.log10(e.y), x: e.x})), SCALE_EXTENT, SCALE_ZERO_MAX, MAX_DATAPOINTS);
		} else {
			chart.setLogscale('y', false, SCALE_EXTENT);
			//chart.updateData(history, SCALE_EXTENT, SCALE_ZERO_MAX, MAX_DATAPOINTS);
		}
	});

	function updateChart(data) {
		if($('#optimize_'+safeDivID).prop('checked')) {
			data = optimizePoints(data, MAX_DATAPOINTS, []);
		}
		chart.updateData(data, SCALE_EXTENT, SCALE_EXTENT, MAX_DATAPOINTS);
	}

	$('#start'+safeDivID).on('change', function() {
		let startDate = new Date($('#start'+safeDivID).val()).getTime();
		let nd = history.filter(e => e.x >= startDate);
		updateChart(nd);
	})
	$('#end'+safeDivID).on('change', function() {
		let endDate = new Date($('#end'+safeDivID).val()).getTime();
		let nd = history.filter(e => e.x <= endDate);
		updateChart(nd);
	})
	$('#optimize_'+safeDivID).on('change', function() {
		let startDate = new Date($('#start'+safeDivID).val()).getTime();
		let endDate = new Date($('#end'+safeDivID).val()).getTime();
		if($('#optimize_'+safeDivID).prop('checked')) {
			updateChart(history.filter(e => e.x >= startDate && e.x <= endDate))
		} else {
			updateChart(history)
		}
	})
}

function tcMakeDailyBarchart(divID, raw_data) {
	let data = [{x: "Monday", y: 0}, {x: "Tuesday", y: 0},{x: "Wednesday", y: 0},{x: "Thursday", y: 0},{x: "Friday", y: 0},{x: "Saturday", y: 0}, {x: "Sunday", y: 0}]
	raw_data.forEach(function(e) {
		let date = new Date();
		date.setTime(e.ts*1000);
		let day = mod((date.getDay() - 1), 7);
		data[day].y += 1;
	});
	let builder = new TCChartBuilder(BAR_CHART);
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(20,50,20,20)
		.setXAxisScale(BAND_SCALE)
		.setXAxisScaleDomain(SCALE_MAP)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_ZERO_MAX)
		.build(530, 300);
}

function tcMakeLevenshteinChart(divID, data) {
	let builder = new TCChartBuilder(BAR_CHART);
	let chart = builder
		.setParentDiv($(divID))
		.setData(data)
		.setFilled(true)
		.setMargin(20,50,20,20)
		.setXAxisScale(BAND_SCALE)
		.setXAxisScaleDomain(SCALE_MAP)
		.setYAxisScale(LINEAR_SCALE)
		.setYAxisScaleDomain(SCALE_ZERO_MAX)
		.build(getWidthSafe($(divID), "#myTabContent"), $(divID).height());
}