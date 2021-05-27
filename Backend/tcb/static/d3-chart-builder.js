/**
 * THIS IS A PROTOTYPE, IT MOSTLY IS UNTESTED / UNIMPLEMENTED
 * TODO: Everything related to styling
 */

const LINE_CHART 		= 	0x1;
const BAR_CHART 		= 	0x2;
const DOTTED_LINE_CHART = 	0x3;

const TIME_SCALE 		= 	0x10;
const LINEAR_SCALE 		= 	0x20;
const BAND_SCALE		=	0x30;

const SCALE_EXTENT 		= 	0x100;
const SCALE_ZERO_MAX	= 	0x200;
const SCALE_MAP			= 	0x300;

const formatTime = d3.timeFormat("%e %B %Y");

const TWITTER_COLOR = '#1DA1F2';
const DOT_COLOR = '#14171A';

class TCChart {


	constructor(parentDiv, width, height ,margin, xScale, yScale, data, generators, dotted, hover_evt, out_evt, click_evt, internalBuilder, highlighted_pts, xlabel, ylabel) {
		this.hover_evt = hover_evt;
		this.out_evt = out_evt;
		this.width = width;
		this.height = height;
		this.margin = margin;
		this.xScale = xScale;
		this.yScale = yScale;
		this.data = data;
		this.generators = generators;
		this.dotted = dotted;
		this.internalBuilder = internalBuilder;
		this.highlighted_pts = highlighted_pts;
		this.svg = d3.select('#'+parentDiv.attr('id'))
			.append("div")
			.classed("svg-container", true)
			.style("padding-bottom", ((height+margin.bottom+margin.top)/(width+margin.left+margin.right)*100)+"%")
			.append("svg")
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox", "0 0 "+(width+margin.left+margin.right)+" "+(height+margin.bottom+margin.top))
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

		// text label for the x axis
		this.svg.append("text")             
			.attr("transform",
				"translate(" + (width/2) + " ," +  (height + 30) + ")")
			.style("text-anchor", "middle")
			.text(xlabel);

		//text label for the y axis
		this.svg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - margin.left)
			.attr("x",0 - (height / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.text(ylabel);   
		// 9. Append the path, bind the data, and call the line generator 
		this.generators[0](this) //create function
		
		if(dotted) {
			this.svg.selectAll(".dot")
				.data(data)
				.enter().append("circle") // Uses the enter().append() method
					.attr("class", "dot") // Assign a class for styling
					.attr("cx", function(d) { return xScale(d.x) })
					.attr("cy", function(d) { return yScale(d.y) })
					.attr("r",  function(d) { return highlighted_pts.includes(d.x / 1000) ? 10 : 4})
					.attr('opacity',  function(d) { return highlighted_pts.includes(d.x / 1000) ? 0.8 : 0.4})
					.style('fill', function(d) { return highlighted_pts.includes(d.x / 1000) ? DOT_COLOR : TWITTER_COLOR }) // dark gray and twitter blue
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
			_scale = d3.scaleLog().clamp(true); //clamps to avoid log(0) = NaN
		}
		if(axis_domain == SCALE_EXTENT) {
			if(axis == 'x') {
				this.xScale = _scale.domain(d3.extent(this.data, function(d) { return log ? Math.max(d.x, 0.01) : d.x }))
			} else if(axis == 'y') {
				this.yScale = _scale.domain(d3.extent(this.data, function(d) { return log ? Math.max(d.y, 0.01) : d.y }))
			} 
		} else if(axis_domain == SCALE_ZERO_MAX) {
			if(axis == 'x') {
				this.xScale = _scale.domain([0.01, d3.max(this.data, function(d) { return d.x })])
			} else if(axis == 'y') {
				this.yScale = _scale.domain([0.01, d3.max(this.data, function(d) { return d.y })])
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

		this.generators = this.internalBuilder.build(this.xScale, this.yScale, this.width, this.height)
		this.generators[1](this, 500)
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
		this.generators[1](this, transition_time);
		let _xs = this.xScale;
		let _ys = this.yScale;

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
				.style('fill', function(d) { return _h.includes(d.x / 1000) ? DOT_COLOR : TWITTER_COLOR })
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
		} else if(type == BAR_CHART) {
			this.internalBuilder = new TCInternalBarChartBuilder();
		} 
		this.xlabel = ""
		this.ylabel = ""
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

	setXLabel(label) {
		this.xlabel = label;
		return this;
	}

	setYLabel(label) {
		this.ylabel = label;
		return this;
	}

	build(width, height) {
		this.width = width - this.margin.left - this.margin.right;
		this.height = height - this.margin.top - this.margin.bottom;

		if(this.x_scale_type == TIME_SCALE) {
			this.xScale = d3.scaleTime()
		} else if (this.x_scale_type == LINEAR_SCALE) {
			this.xScale = d3.scaleLinear()
		} else if (this.x_scale_type == BAND_SCALE) {
			this.xScale = d3.scaleBand().padding(0.1)
		}

		if(this.y_scale_type == TIME_SCALE) {
			this.yScale = d3.scaleTime()
		} else if (this.y_scale_type == LINEAR_SCALE) {
			this.yScale = d3.scaleLinear()
		} else if (this.y_scale_type == BAND_SCALE) {
			this.yScale = d3.scaleBand().padding(0.1)
		}


		let _extent = function(f,data) { return d3.extent(data, f)}
		let _zero_max = function(f,data) { return [0, d3.max(data, f)]}
		let _map = function(f,data) { return data.map(f) }
		if(this.x_scale_domain == SCALE_EXTENT) {
			this.xScale.domain(_extent(function(d) { return d.x; }, this.data));
		} else if(this.x_scale_domain == SCALE_ZERO_MAX) {
			this.xScale.domain(_zero_max(function(d) { return d.x; }, this.data));
		} else if(this.x_scale_domain == SCALE_MAP) {
			this.xScale.domain(_map(function(d) { return d.x; }, this.data))
		}
		this.xScale.range([0, this.width])
		if(this.y_scale_domain == SCALE_EXTENT) {
			this.yScale.domain(_extent(function(d) { return d.y; }, this.data));
		} else if(this.y_scale_domain == SCALE_ZERO_MAX) {
			this.yScale.domain(_zero_max(function(d) { return d.y; }, this.data));
		} else if(this.y_scale_domain == SCALE_MAP) {
			this.yScale.domain(_map(function(d) { return d.y; }, this.data))
		}
		this.yScale.range([this.height, 0])
		
		let generators = this.internalBuilder.build(this.xScale, this.yScale, this.width, this.height);

		return new TCChart(this.parentDiv, this.width, this.height, this.margin, this.xScale, this.yScale, 
							this.data, generators, (this.type === DOTTED_LINE_CHART), this.hover_evt, this.out_evt, this.click_evt,
							 this.internalBuilder, this.highlighted_pts, this.xlabel, this.ylabel);
	}
	
}

class TCInternalLineChartBuilder {

	setFilled(filled) {
		this.filled = filled;
	}

	build(xScale, yScale, width, height) {
		let line = undefined;
		if(this.filled) {
			line = d3.area()
				.x(function(d) { return xScale(d.x); })
				.y1(function(d) { return yScale(d.y); })
				.y0(height)
				.curve(d3.curveMonotoneX)
		} else {
			line = d3.line()
				.x(function(d) { return xScale(d.x); })
				.y(function(d) { return yScale(d.y); })
				.curve(d3.curveMonotoneX)
		}

		let create = function(self) {
			self.path = self.svg.append("path")
				.datum(self.data) // 10. Binds data to the line 
				.attr("class", "line") // Assign a class for styling 
				.attr("d", line); // 11. Calls the line generator 
		}

		let update = function(self, transition_time) {
			let _xs = self.xScale;
			let _ys = self.yScale;
			let _ib = self.internalBuilder;
			let _h = self.height
			self.path.datum(self.data);
			let _p = self.path
			self.path
				.enter()
				.attr("class","line")
				.merge(_p)
				.transition()
				.duration(transition_time)
				.attr("d", line)
		}

		return [create, update]
	}
}

class TCInternalBarChartBuilder {

	constructor(builder) {
		this.builder = builder;
	}

	setFilled(filled) {
		this.filled = filled;
	}

	build(xScale, yScale, width, height) {
		let create = function(self) {
			console.log(self.data)
			if(self.xScale.bandwidth != undefined) {
				self.svg.selectAll("bar")
					.data(self.data)
					.enter().append("rect")
					.style("fill", TWITTER_COLOR)
					.attr("x", function(d) { return self.xScale(d.x); })
					.attr("width", self.xScale.bandwidth())
					.attr("y", function(d) { return self.yScale(d.y); })
					.attr("height", function(d) { return height - self.yScale(d.y); });
			} else {
				self.svg.selectAll("bar")
					.data(self.data)
					.enter().append("rect")
					.style("fill", TWITTER_COLOR)
					.attr("y", function(d) { return self.yScale(d.y); })
					.attr("height", self.yScale.bandwidth())
					.attr("x", function(d) { return 1; })
					.attr("width", function(d) { return self.xScale(d.x); });
			}
		}

		let update = function(self, transition_time) {

		}
		return [create, update];
	}
}