const LINE_CHART 		= 	0x1;
const BAR_CHART 		= 	0x2;

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


	constructor(parentDiv, width, height ,margin, xScale, yScale, data, content) {
		let svg = d3.select('#'+parentDiv.attr('id'))
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
		let yAxis = svg.append("g")
			.attr("class", "y axis")
			.call(d3.axisLeft(yScale).ticks(5)); // Create an axis component with d3.axisLeft

		// 9. Append the path, bind the data, and call the line generator 
		svg.append("path")
			.datum(data) // 10. Binds data to the line 
			.attr("class", "line") // Assign a class for styling 
			.attr("d", content); // 11. Calls the line generator 
	}
}

class TCChartBuilder {

	constructor(type) {
		this.type = type;
		this.margin = {top: 0, right: 0, bottom: 0, left: 0}
		if(type == LINE_CHART) {
			this.internalBuilder = new TCInternalLineChartBuilder();
		}
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

		return new TCChart(this.parentDiv, this.width, this.height, this.margin, this.xScale, this.yScale, this.data, content);
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