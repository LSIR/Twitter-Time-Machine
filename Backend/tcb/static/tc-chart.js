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
	
	let safeDivID = divID.substr(1);
	$(divID+" > .svg-container").append('<div class="row" id="'+safeDivID+'_controls"></div>')
	let controlRow = $(divID+'_controls')
	controlRow.append('<div class="offset-1 col-2 form-switch">\
				<input class="form-check-input" type="checkbox" id="logscale_'+safeDivID+'">\
				<label class="form-check-label" for="logscale_'+safeDivID+'">Logarithmic scale</label>\
				</div>')
	controlRow.append('<div class="col-2 form-switch">\
				<input onchange="optimizePoints(\''+divID+'\', 500)" checked class="form-check-input" type="checkbox" id="optimize_'+safeDivID+'">\
				<label class="form-check-label" for="optimize_'+safeDivID+'">Optimize Points</label>\
				</div>')
	let minDate = new Date(history[0].x).yyyymmdd()
	let maxDate = new Date(history[history.length-1].x).yyyymmdd();
	controlRow.append('<div class="col-3">\
							<label for="start'+safeDivID+'">Start Date</label>\
							<input onchange="optimizePoints(\''+divID+'\', 500)" type="date" id="start'+safeDivID+'" value="'+minDate+'" min="'+minDate+'" max="'+maxDate+'">\
						</div>')
	controlRow.append('<div class="col-3">\
							<label for="end'+safeDivID+'">End Date</label>\
							<input onchange="optimizePoints(\''+divID+'\', 500)" type="date" id="end'+safeDivID+'" value="'+maxDate+'" min="'+minDate+'" max="'+maxDate+'">\
						</div>')

	$('#logscale_'+safeDivID).on('click', function() {
		if($('#logscale_'+safeDivID).prop('checked')) {
			chart.setLogscale('y', true, SCALE_EXTENT);
			//chart.updateData(history.map(e => ({y: Math.log10(e.y), x: e.x})), SCALE_EXTENT, SCALE_ZERO_MAX, 500);
		} else {
			chart.setLogscale('y', false, SCALE_EXTENT);
			//chart.updateData(history, SCALE_EXTENT, SCALE_ZERO_MAX, 500);
		}
	});
	
}

	