(function() {

	angular
		.module('AnrModule')
		.factory('MiniHorizontalBarChartsService', ['gettextCatalog', function(gettextCatalog) {

			/**
			 * Generate a grouped/stacked Vertical Bar Chart
			 * @param {string} tag - tag where to put the svg
			 * @param {object} data - The data for the graph
			 * @param {object} parameters - options of chart
			 *        {object}   margin - top: 20, right: 20, bottom: 30, left: 40
			 *        {int}      width - width of the graph
			 *        {int}      height - height of the graph
			 *        {boolean}  sort - sort data in descending order
			 *        {array}    color - colors pallete of series
			 *        {boolean}  colorGradient - get color pallete on gradient range
			 *        {boolean}  showValues - show labels of values
			 *        {object}   forceDomainX - Force min and max of y axis, ex. min: 0, max: 10
			 * @return {svg} chart svg
			 */

			function draw(tag, data, parameters) {
				var options = {
					margin: {
						top: 15,
						right: 100,
						bottom: 30,
						left: 40
					},
					width: 400,
					height: 300,
					sort: false,
					color: d3.schemeCategory10,
					colorGradient: false,
					showValues: true,
				} //default options for the graph

				options = angular.extend(options, parameters); //merge the parameters to the default options

				var margin = options.margin,
					width = options.width - margin.left - margin.right,
					height = options.height - margin.top - margin.bottom;

				var x = d3.scaleLinear()
					.range([0, width]);

				var y = d3.scaleBand()
					.range([height, 0])
					.padding(0.1);

				var yAxis = d3.axisLeft(y)


				var xAxis = d3.axisBottom(x)
					.tickSize(-height)
					.tickSizeOuter(0);

				var numberFormat = d3.format(".5");

				var color = d3.scaleOrdinal()
					.range(options.color)

				d3.select(tag).selectAll("svg").remove();

				var datasets = data.filter(dataset => dataset && Object.keys(dataset).length)

				var svg = d3.select(tag)
					.selectAll("miniCharts")
					.data(datasets)
					.enter()
					.append("svg")
					.attr("class", (d, i) => {
						return "minichart" + i
					})
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.style("user-select", "none")
					.append("g")
					.attr("transform", `translate(${margin.left},${margin.top})`);

				if (data.length === 0) {
					svg.append('text')
						.attr("x", (width * .3))
						.attr("y", (height * .3))
						.style("text-anchor", "middle")
						.style("font-size", 20)
						.style("font-weight", "bold")
						.text(gettextCatalog.getString('No Data Avalaible'))
					return;
				}

				datasets.forEach((dataset, index) => {
					if (options.sort) {
						dataset.sort((a, b) => {
							return a.value - b.value
						})
					}

					let categoriesNames = dataset.map(d => d.category);
					let values = dataset.map(d => d.value);
					let title = dataset[0].title;

					if (options.colorGradient) {
						color = d3.scaleLinear()
							.range(options.color)
							.domain(d3.extent(values))
							.interpolate(d3.interpolateHcl)
					}

					y.domain(categoriesNames);
					x.domain([0, d3.max(values)]).nice();

					if (options.forceDomainX) {
						x.domain([options.forceDomainX.min, options.forceDomainX.max]).nice()
					}

					svg = d3.selectAll(".minichart" + index).select("g");

					svg.append("g")
						.attr("class", "xAxis")
						.attr("transform", `translate(0,${height})`)
						.call(xAxis);

					svg.append("text")
						.attr("x", (width / 2))
						.attr('class', "chartTitle")
						.attr("y", -margin.top / 2)
						.attr("text-anchor", "middle")
						.style("font-size", 14)
						.text(title)

					svg.append("g")
						.attr("class", "yAxis")
						.call(yAxis)

					svg.selectAll(".yAxis").selectAll("text")
						.call(wrap, margin.left);

					customizeTicks();

					let category = svg.selectAll(".category")
						.data(dataset)
						.enter()
						.append("g")
						.attr("class", d => {
							return "category " + d.category.replace(/\s/g, '')
						})
						.attr("transform", () => {
							return `translate(1,0)`;
						})

					category.append("rect")
						.attr("height", y.bandwidth())
						.attr("y", d => {
							return y(d.category);
						})
						.style("fill", d => {
							return setColor(d)
						})
						.attr("x", () => {
							return x(0);
						})
						.attr("width", () => {
							return x(0);
						});

					category.selectAll("rect")
						.transition()
						.attr("width", d => {
							return x(d.value);
						})
						.duration(500);


					if (options.showValues) {
						category.append("text")
							.attr("dx", "1em")
							.attr("transform", d => {
								return `translate(${x(0)},${y(d.category)})`;
							})
							.attr("y", y.bandwidth() / 2)
							.attr("text-anchor", "start")
							.attr("font-size", 10)
							.attr("font-weight", "bold")
							.attr("opacity", 0)
							.text(d => {
								return numberFormat(d.value);
							});

						category.selectAll("text")
							.transition()
							.attr("transform", d => {
								return `translate(${x(d.value)},${y(d.category)})`;
							})
							.attr("opacity", 1)
							.duration(500);
					}
				});

				function setColor(d) {
					if (options.colorGradient) {
						let hexColor = d3.color(color(d.value)).formatHex()
						return hexColor
					} else {
						let hexColor = d3.color(color(d.category)).formatHex()
						return hexColor
					}
				}

				function customizeTicks() {
					var yTicks = svg.selectAll(".xAxis").selectAll(".tick")
					yTicks.selectAll("line")
						.attr("opacity", 0.7)
						.attr("transform", `translate(1,0)`)
						.attr("stroke", "lightgrey");
				}

				function wrap(text, width) {
					var maxLines = Math.round(y.bandwidth() / 11.5);
					text.each(function() {
						var text = d3.select(this),
							maxLinesTextSplited = Math.ceil(text.node().getComputedTextLength() / (width - 50)),
							words = text.text().split(/\s+/).reverse(),
							word,
							numberChar = Math.round((width - 50) / 4),
							line = [],
							lineNumber = 0,
							x = text.attr("x"),
							y = 0,
							dy = 0.3,
							tspan = text.text(null)
							.append("tspan")
							.attr("x", x)
							.attr("y", y)
							.attr("dy", dy + "em");
						while (word = words.pop()) {
							line.push(word);

							if (lineNumber == maxLines - 1) {
								tspan.text(line.join(" "));
								if (tspan.text().length > numberChar - 3) {
									tspan.text(line.join(" ").substring(0, numberChar - 3) + " ...");
								}
								continue;
							} else {
								tspan.text(line.join(" "));
							}

							if (tspan.node().getComputedTextLength() > width - 50) {
								line.pop();
								dy = -0.3 * Math.min(maxLinesTextSplited, maxLines) / 2;
								tspan.text(line.join(" "));
								tspan.attr("dy", lineNumber + dy + "em");
								numberChar = tspan.text().length;
								line = [word];
								tspan = text.append("tspan")
									.attr("x", x)
									.attr("y", y)
									.attr("dy", ++lineNumber + dy + "em")
									.text(word);
							}
						}
					});
				}

			}
			return {
				draw: draw
			}
		}]);

})
();
