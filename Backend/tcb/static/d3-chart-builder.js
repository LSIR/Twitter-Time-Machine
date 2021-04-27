/**
 * THIS IS A PROTOTYPE, IT MOSTLY IS UNTESTED / UNIMPLEMENTED
 * TODO: Everything related to styling
 */

const LINE_CHART 		= 	0x1;
const BAR_CHART 		= 	0x2;
const DOTTED_LINE_CHART = 	0x3;

const TIME_SCALE 		= 	0x10;
const LINEAR_SCALE 		= 	0x20;

const SCALE_EXTENT 		= 	0x100;
const SCALE_ZERO_MAX	= 	0x200;

const formatTime = d3.timeFormat("%e %B %Y");

function getWidthSafe(elem, parentID) {
	let element = $(elem).clone();
	element.css({ visibility: 'hidden' });
	$(parentID).append(element);
	let width = element.outerWidth();
	element.remove();
	return width;
}

class TCChart {


	constructor(parentDiv, width, height ,margin, xScale, yScale, data, content, dotted, hover_evt, out_evt, click_evt, internalBuilder, highlighted_pts) {
		this.hover_evt = hover_evt;
		this.out_evt = out_evt;
		this.width = width;
		this.height = height;
		this.margin = margin;
		this.xScale = xScale;
		this.yScale = yScale;
		this.data = data;
		this.content = content;
		this.dotted = dotted;
		this.internalBuilder = internalBuilder;
		this.highlighted_pts = highlighted_pts;
		this.svg = d3.select('#'+parentDiv.attr('id'))
			.append("div")
			.classed("svg-container", true)
			.append("svg")
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox", "0 0 "+(width+margin.left)+" "+(height+2*margin.top))
			.classed("svg-content-responsive", true)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");



		this.x_grid = this.svg.append("g")
			.attr("class", "grid")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(xScale)
				.tickSize(-height)
				.tickFormat("")
			);

		this.y_grid = this.svg.append("g")
			.attr("class", "grid")
			.call(d3.axisLeft(yScale).ticks(5)
				.tickSize(-width)
				.tickFormat("")
			);

		// 3. Call the x axis in a group tag
		this.xAxis = this.svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(xScale))
			 // Create an axis component with d3.axisBottom

		// 4. Call the y axis in a group tag
		this.yAxis = this.svg.append("g")
			.attr("class", "y axis")
			.call(d3.axisLeft(yScale).ticks(5)); // Create an axis component with d3.axisLeft

		// 9. Append the path, bind the data, and call the line generator 
		this.path = this.svg.append("path")
			.datum(data) // 10. Binds data to the line 
			.attr("class", "line") // Assign a class for styling 
			.attr("d", content); // 11. Calls the line generator 
		
		if(dotted) {
			this.svg.selectAll(".dot")
				.data(data)
				.enter().append("circle") // Uses the enter().append() method
					.attr("class", "dot") // Assign a class for styling
					.attr("cx", function(d) { return xScale(d.x) })
					.attr("cy", function(d) { return yScale(d.y) })
					.attr("r",  function(d) { return highlighted_pts.includes(d.x / 1000) ? 10 : 4})
					.attr('opacity',  function(d) { return highlighted_pts.includes(d.x / 1000) ? 0.8 : 0.4})
					.style('fill', function(d) { return highlighted_pts.includes(d.x / 1000) ? 'red' : 'blue' })
					.on("mouseover", hover_evt)					
					.on("mouseout", out_evt)
					.on("click", click_evt)
		}
	}

	setLogscale(axis, log, axis_domain) {
		let _scale = undefined;
		if(!log) {
			_scale = d3.scaleLinear();
		} else {
			_scale = d3.scaleLog();
		}
		if(axis_domain == SCALE_EXTENT) {
			if(axis == 'x') {
				this.xScale = _scale.domain(d3.extent(this.data, function(d) { return d.x }))
			} else if(axis == 'y') {
				this.yScale = _scale.domain(d3.extent(this.data, function(d) { return d.y }))
			} 
		} else if(axis_domain == SCALE_ZERO_MAX) {
			if(axis == 'x') {
				this.xScale = _scale.domain([0, d3.max(this.data, function(d) { return d.x })])
			} else if(axis == 'y') {
				this.yScale = _scale.domain([0, d3.max(this.data, function(d) { return d.y })])
			} 
		}
		this.xScale.range([0, this.width]);
		this.yScale.range([this.height, 0]);
		
		this.yAxis
			.transition()
			.duration(500)
			.call(d3.axisLeft(this.yScale).ticks(5))
		this.xAxis
			.transition()
			.duration(500)
			.call(d3.axisBottom(this.xScale));
		let _xs = this.xScale;
		let _ys = this.yScale;
		if(this.dotted) {
			this.svg.selectAll(".dot")
				.transition()
				.duration(500)
				.attr("cx", function(d) { return _xs(d.x) })
				.attr("cy", function(d) { return _ys(d.y) })
		}
		let _ib = this.internalBuilder;
		let _h = this.height
		this.path.transition()
			.duration(500)
			.attr("d", _ib.build(_xs, _ys, _h))
	}

	updateData(data, x_scale_domain, y_scale_domain, transition_time) {	
		// Create the X axis:
		this.data = data;
		if(x_scale_domain == SCALE_EXTENT) {
			this.xScale.domain(d3.extent(data, function(d) { return d.x }));
		} else if(x_scale_domain == SCALE_ZERO_MAX) {
			this.xScale.domain([0, d3.max(data, function(d) { return d.x })]);
		}
		this.xAxis.transition()
			.duration(transition_time)
			.call(d3.axisBottom(this.xScale));

		// create the Y axis
		if(y_scale_domain == SCALE_ZERO_MAX) {
			this.yScale.domain([0, d3.max(data, function(d) { return d.y  }) ]);
		} else if(y_scale_domain == SCALE_EXTENT) {
			this.yScale.domain(d3.extent(data, function(d) { return d.y }));
		}
		this.yAxis.transition()
			.duration(transition_time)
			.call(d3.axisLeft(this.yScale).ticks(5)); // Create an axis component with d3.axisLeft

		// Update the line
		//don't have access to "this" inside d3 code...
		let _xs = this.xScale;
		let _ys = this.yScale;
		let _ib = this.internalBuilder;
		let _h = this.height
		this.path.datum(data);
		let _p = this.path
		this.path
			.enter()
			.attr("class","line")
			.merge(_p)
			.transition()
			.duration(transition_time)
			.attr("d", _ib.build(_xs, _ys, _h))

		if(this.dotted) {
			let _d = this.svg.selectAll(".dot").remove().exit();
			let _h = this.highlighted_pts;
			this.svg.selectAll(".dot")
				.data(data).enter().append("circle")
				.attr("class", "dot") // Assign a class for styling
				.attr("cx", function(d) { return _xs(d.x) })
				.attr("cy", function(d) { return _ys(d.y) })
				.attr("r",  function(d) { return _h.includes(d.x / 1000) ? 10 : 4})
				.attr('opacity',  function(d) { return _h.includes(d.x / 1000) ? 0.8 : 0.4})
				.style('fill', function(d) { return _h.includes(d.x / 1000) ? 'red' : 'blue' })
				.on("mouseover", this.hover_evt)					
				.on("mouseout", this.out_evt)
				.on("click", this.click_evt)
		}
	}
}

class TCChartBuilder {

	constructor(type) {
		this.type = type;
		this.margin = {top: 0, right: 0, bottom: 0, left: 0}
		if(type == LINE_CHART || type == DOTTED_LINE_CHART) {
			this.internalBuilder = new TCInternalLineChartBuilder();
		}
	}

	setHighlightedPoints(pts) {
		this.highlighted_pts = pts;
		return this;
	}

	setHoverEvent(f) {
		this.hover_evt = f;
		return this;
	}

	setOutEvent(f) {
		this.out_evt = f;
		return this;
	}

	setClickEvent(f) {
		this.click_evt = f;
		return this;
	}

	setFilled(filled) {
		this.internalBuilder.setFilled(filled);
		return this;
	}

	setXAxisScale(scale_type) {
		this.x_scale_type = scale_type;
		return this;
	}

	setYAxisScale(scale_type) {
		this.y_scale_type = scale_type;
		return this;
	}

	setXAxisScaleDomain(scale_domain) {
		this.x_scale_domain = scale_domain;
		return this;
	}

	setYAxisScaleDomain(scale_domain) {
		this.y_scale_domain = scale_domain;
		return this;
	}

	/**
	 * @param {Array} data [{x,y}] format
	 */
	setData(data) {
		this.data = data;
		return this;
	}

	/**
	 * @param {JQueryObject} divObj JQuery-selected parent div
	 */
	setParentDiv(divObj) {
		this.parentDiv = divObj;
		return this;
	}

	setMargin(t,b,l,r) {
		this.margin = {top: t, right: r, bottom: b, left: l}
		return this;
	}

	setParentDivByID(divID) {
		this.setParentDiv($(divID));
		return this;
	}

	build() {
		this.width = getWidthSafe(this.parentDiv, "#myTabContent") - this.margin.left - this.margin.right;
		this.height = this.parentDiv.height() - this.margin.top - this.margin.bottom;

		if(this.x_scale_type == TIME_SCALE) {
			this.xScale = d3.scaleTime()
		} else if (this.x_scale_type == LINEAR_SCALE) {
			this.xScale = d3.scaleLinear()
		}

		if(this.y_scale_type == TIME_SCALE) {
			this.yScale = d3.scaleTime()
		} else if (this.y_scale_type == LINEAR_SCALE) {
			this.yScale = d3.scaleLinear()
		}


		let _extent = function(f,data) { return d3.extent(data, f)}
		let _zero_max = function(f,data) { return [0, d3.max(data, f)]}
		if(this.x_scale_domain == SCALE_EXTENT) {
			this.xScale.domain(_extent(function(d) { return d.x; }, this.data));
		} else if(this.x_scale_domain == SCALE_ZERO_MAX) {
			this.xScale.domain(_zero_max(function(d) { return d.x; }, this.data));
		}
		this.xScale.range([0, this.width])
		if(this.y_scale_domain == SCALE_EXTENT) {
			this.yScale.domain(_extent(function(d) { return d.y; }, this.data));
		} else if(this.y_scale_domain == SCALE_ZERO_MAX) {
			this.yScale.domain(_zero_max(function(d) { return d.y; }, this.data));
		}
		this.yScale.range([this.height, 0])
		
		let content = this.internalBuilder.build(this.xScale, this.yScale, this.height);

		return new TCChart(this.parentDiv, this.width, this.height, this.margin, this.xScale, this.yScale, this.data, content, (this.type === DOTTED_LINE_CHART), this.hover_evt, this.out_evt, this.click_evt, this.internalBuilder, this.highlighted_pts);
	}
	
}

class TCInternalLineChartBuilder {

	setFilled(filled) {
		this.filled = filled;
	}

	build(xScale, yScale, height) {
		if(this.filled) {
			return d3.area()
				.x(function(d) { return xScale(d.x); })
				.y1(function(d) { return yScale(d.y); })
				.y0(height)
				.curve(d3.curveMonotoneX)
		} else {
			return d3.line()
				.x(function(d) { return xScale(d.x); })
				.y(function(d) { return yScale(d.y); })
				.curve(d3.curveMonotoneX)
		}
	}
}