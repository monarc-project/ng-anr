(function() {

  angular
    .module('AnrModule')
    .factory('VerticalBarChartService', ['gettextCatalog', function (gettextCatalog){

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
       *        {boolean}  multipleYaxis - set a second y axis
       *        {boolean}  showLegend - show legend
       *        {string}   yLabel - y axis label
       *        {string}   y2Label - y axis label
       *        {int}      rotationXAxisLabel - degrees to rotate x Axis labels
       *        {float}    offsetXAxisLabel - Offset dy for x Axis labels
       *        {object}   forceDomainY - Force min and max of y axis, ex. min: 0, max: 10
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
          multipleYaxis: false,
          showLegend: true,
          rotationXAxisLabel: 0,
          offsetXAxisLabel: 0,
        } //default options for the graph

        options = angular.extend(options, parameters); //merge the parameters to the default options

        var margin = options.margin,
          width = options.width - margin.left - margin.right,
          height = options.height - margin.top - margin.bottom;

        var x = d3.scaleBand()
          .range([0, width])
          .padding(0.1);

        var y = d3.scaleLinear()
          .range([height, 0]);

        var y2 = d3.scaleLinear()
          .range([height, 0]);

        var xAxis = d3.axisBottom(x);

        var yAxis = d3.axisLeft(y)
          .tickSize(-width)
          .tickSizeOuter(0);

        var y2Axis = d3.axisRight(y2)
          .tickSize(width)
          .tickSizeOuter(0);

        var line = d3.line()
          .curve(d3.curveMonotoneX)
          .x(d => {return x(d.category) + x.bandwidth() /2})
          .y(d => {
              if (!isNaN(d.average)) return y2(d.average)
              return y2(0)
           });

        var numberFormat = d3.format(".5");

        d3.select(tag).selectAll("svg").remove();
        d3.selectAll(".tooltip" + tag.substring(1)).remove();

        var svg = d3.select(tag).append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style("user-select", "none")
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        var tooltip = d3.select("body").append("div")
          .attr("class", "tooltip" + tag.substring(1))
          .style("opacity", 0)
          .style("position", "absolute")
          .style("background-color", "white")
          .style("color", "rgba(0,0,0,0.87)")
          .style("border", "solid black")
          .style("border-width", "1px")
          .style("border-radius", "5px")
          .style("padding", "5px")
          .style("font-size", "10px");

        if (data.length === 0) {
          svg.append('text')
            .attr("x", (width / 2))
            .attr("y", (height / 2))
            .style("text-anchor", "middle")
            .style("font-size", 20)
            .style("font-weight", "bold")
            .text(gettextCatalog.getString('No Data Avalaible'))
          return;
        }

        if (options.sort) {
          data.sort(function(a, b) {
            return b['value'] - a['value']
          })
        }

        data.forEach(function(d){
          if (d.translationLabelKey == undefined) {
            d.translationLabelKey = d.category;
          }
          d.category = gettextCatalog.getString(d.translationLabelKey);
        })

        var newCategories = [];
        var filtered = []; //to control legend selections
        var categoriesNames = data.map(d => d.category);
        var values = data.map(d => d.value);
        var averages = [];
        var color = d3.scaleOrdinal()
          .range(options.color)

        if (options.colorGradient) {
          color = d3.scaleLinear()
            .range(options.color)
            .domain(d3.extent(values))
            .interpolate(d3.interpolateHcl)
        }


        x.domain(categoriesNames);
        y.domain([0, d3.max(values)]).nice();
        if (options.forceDomainY) {
          y.domain([options.forceDomainY.min, options.forceDomainY.max]).nice()
        }


        svg.append("g")
          .attr("class", "xAxis")
          .attr("transform", `translate(0,${height})`)
          .call(xAxis);


        if (options.rotationXAxisLabel !== 0) {
          svg.selectAll(".xAxis").selectAll("text")
            .attr("transform", `rotate(${options.rotationXAxisLabel})`)
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", `${options.offsetXAxisLabel}em`)
            .style("text-anchor", "start")
            .call(wrap, margin.bottom);
        }


        svg.append("g")
          .attr("class", "yAxis")
          .call(yAxis)

        if (options.yLabel) {
            svg.append("text")
              .attr("transform", "rotate(-90)")
              .attr("x", -height/2)
              .attr("dy", "-2em")
              .style("text-anchor", "middle")
              .attr("font-size",10)
              .text(gettextCatalog.getString(options.yLabel));
        }

        if (svg.selectAll(".yAxis").selectAll(".tick").nodes().shift()) {
          svg.selectAll(".yAxis").selectAll(".tick")
            .nodes().shift()
            .remove();
        }

        customizeTicks("yAxis");

        if (options.multipleYaxis) {
            data.map(d => {
              averages.push(
                {
                  category: d.category,
                  average: d.sum / d.value
                }
              )
            })

            y2.domain([0, d3.max(averages.map(x => x.average))]).nice();

            svg.append("g")
                .attr("class", "y2Axis")
                .call(y2Axis)
                .call(g => g.select(".domain").remove());

            if (svg.selectAll(".y2Axis").selectAll(".tick").nodes().shift()) {
              svg.selectAll(".y2Axis").selectAll(".tick")
                .nodes().shift()
                .remove();
            }

            customizeTicks("y2Axis");
        }

        var category = svg.selectAll(".category")
          .data(data)
          .enter().append("g")
          .attr("class", (d) => {
            return "category " + d.category.replace(/\s/g, '')
          })
          .on("mouseover", mouseover)
          .on("mousemove", function(d) {
            mousemove(d, this)
          })
          .on("mouseleave", mouseleave);

        if(options.onClickFunction){
          category
              .on("mousedown", function() { mouseleave() })
              .on("click", options.onClickFunction);
        }

        category.append("rect")
          .attr("width", x.bandwidth())
          .attr("x", (d) => {
            return x(d.category);
          })
          .style("fill", (d) => {
            return setColor(d)
          })
          .attr("y", () => {
            return y(0);
          })
          .attr("height", () => {
            return height - y(0);
          });

        category.selectAll("rect")
          .transition()
          .attr("y", (d) => {
            return y(d.value);
          })
          .attr("height", (d) => {
            return height - y(d.value);
          })
          .duration(500);


        if (options.showValues) {
          category.append("text")
            .attr("dy", "-.35em")
            .attr("transform", d => {
              return `translate(${x(d.category)},${y(0)})`;
            })
            .attr("x", x.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-weight", "bold")
            .attr("opacity", 0)
            .text((d) => {
              return numberFormat(d.value);
            });

          category.selectAll("text")
            .transition()
            .attr("transform", d => {
              return `translate(${x(d.category)},${y(d.value)})`;
            })
            .attr("opacity", 1)
            .duration(500);
        }

        if (options.multipleYaxis) {
            if (options.y2Label) {
                svg.append("text")
                  .attr("transform", "rotate(-90)")
                  .attr("y", width)
                  .attr("x", -height/2)
                  .attr("dy", "2.5em")
                  .style("text-anchor", "middle")
                  .attr("font-size",10)
                  .text(gettextCatalog.getString(options.y2Label));
            }

          svg.append("path")
            .attr("class", "averageLine")
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.7)
            .attr("stroke-width", 1);

          svg.selectAll('.averageLine')
            .attr('d', () => {if (!isNaN(y2.domain()[1])) return line(averages)});
        }

        if (options.showLegend) {
          var dataLength = 0;
          var legend = svg.selectAll(".legend")
            .data(data)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => {
              let textLength = getWidth(d);
              if (i == 0) {
                dataLength = textLength + 30;
                return `translate(0,-30)`;
              } else {
                let preDataLength = dataLength;
                dataLength += textLength + 30;
                return `translate(${preDataLength},${-30})`;
              }
            })

          legend.append("rect")
            .attr("x", width - dataLength)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", (d) => {
              return setColor(d)
            })
            .attr("stroke", (d) => {
              return setColor(d)
            })
            .attr("id", (d) => {
              return d.category.replace(/\s/g, '');
            })
            .on("click", function() {
              newCategories = getNewCategories(this);
              updateChart(newCategories);
            });

          legend.append("text")
            .attr("x", width - dataLength + 25)
            .attr("y", 9)
            .attr("dy", ".35em")
            .attr("font-size", 10)
            .text((d) => {
              return d.category
            });
        }

        function setColor(d) {
          if (options.colorGradient) {
            let hexColor = d3.color(color(d.value)).formatHex()
            return hexColor
          } else {
            let hexColor = d3.color(color(d.category)).formatHex()
            return hexColor
          }
        }

        function getNewCategories(d) {
          id = d.id;

          if (filtered.indexOf(id) == -1) {
            filtered.push(id);
          } else {
            filtered.splice(filtered.indexOf(id), 1);
          }

          var newCategories = [];
          categoriesNames.forEach((d) => {
            if (filtered.indexOf(d.replace(/\s/g, '')) == -1) {
              newCategories.push(d);
            }
          })

          if (newCategories.length < 1) {
            newCategories = categoriesNames;
            filtered = [];
          }

          legend.selectAll("rect")
            .transition()
            .attr("fill", (d) => {
              if (filtered.length) {
                if (filtered.indexOf(d.category.replace(/\s/g, '')) == -1) {
                  return setColor(d);
                } else {
                  return "white";
                }
              } else {
                return setColor(d);
              }
            })
            .duration(100);

          return newCategories;
        };

        function customizeTicks(axis) {
          let ticks = svg.selectAll("." + axis).selectAll(".tick")
          ticks.selectAll("line")
            .attr("opacity", 0.7)
            .attr("transform", `translate(1,0)`)
            .attr("stroke", "lightgrey");
        }

        function updateChart(newCategories) {
          x.domain(newCategories);
          y.domain([0, d3.max(data, (d) => {
              if (filtered.indexOf(d.category.replace(/\s/g, '')) == -1)
                return d.value;
            })])
            .nice();

          if (options.multipleYaxis) {
            averages = [];
            data.map(d => {
                if (filtered.indexOf(d.category.replace(/\s/g, '')) == -1) {
                    averages.push(
                      {
                        category: d.category,
                        average: d.sum / d.value
                      }
                    )
                }
            })
            y2.domain([
                0,
                d3.max(averages.map(x => x.average)) ? d3.max(averages.map(x => x.average)) : 1
            ]).nice();


            svg.select(".y2Axis")
              .call(y2Axis)
              .call(g => g.select(".domain").remove());

            customizeTicks("y2Axis");

            svg.selectAll('.averageLine')
              .attr('d', () => {if (!isNaN(y2.domain()[1])) return line(averages)});
          }

          if (options.forceDomainY) {
            y.domain([options.forceDomainY.min, options.forceDomainY.max]).nice()
          }

          svg.select(".xAxis")
            .call(xAxis);

          svg.select(".yAxis")
            .transition()
            .call(yAxis)
            .duration(500);

          customizeTicks("yAxis");

          var categories = svg.selectAll(".category");

          categories.filter((d) => {
              return newCategories.indexOf(d.category) == -1;
            })
            .style("visibility", "hidden");

          categories.filter((d) => {
              return newCategories.indexOf(d.category) > -1;
            })
            .transition()
            .style("visibility", "visible")
            .duration(500);

          var categoriesBars = categories.selectAll("rect");
          var categoriesText = categories.selectAll("text")

          categoriesBars.filter((d) => {
              return filtered.indexOf(d.category.replace(/\s/g, '')) > -1;
            })
            .transition()
            .attr("x", function() {
              return (+d3.select(this).attr("x")) + (+d3.select(this).attr("width")) / 2;
            })
            .attr("height", 0)
            .attr("width", 0)
            .attr("y", height)
            .duration(500);

          categoriesText.filter((d) => {
              return filtered.indexOf(d.category.replace(/\s/g, '')) > -1;
            })
            .transition()
            .style("opacity", 0)
            .duration(500);

          categoriesBars.filter((d) => {
              return filtered.indexOf(d.category.replace(/\s/g, '')) == -1;
            })
            .transition()
            .attr("x", (d) => {
              return x(d.category);
            })
            .attr("width", x.bandwidth())
            .attr("y", (d) => {
              return y(d.value);
            })
            .attr("height", (d) => {
              return height - y(d.value);
            })
            .style("opacity", 1)
            .duration(500);

          categoriesText.filter((d) => {
              return filtered.indexOf(d.category.replace(/\s/g, '')) == -1;
            })
            .transition()
            .attr("transform", d => {
              return `translate(${x(d.category)},${y(d.value)})`;
            })
            .attr("x", x.bandwidth() / 2)
            .style("opacity", 1)
            .text((d) => {
              return numberFormat(d.value);
            })
            .duration(500);
        }

        function mouseover() {
          tooltip
            .style("z-index", "100")
            .style("opacity", 0.9);
        }

        function mousemove(d, element) {
          let elementRect = element.getBoundingClientRect();
          let tooltipText = "";
          if (filtered.indexOf(d.category.replace(/\s/g, '')) == -1) {
            tooltipText =
              tooltipText +
              ("<tr><td><div style=width:10px;height:10px;background-color:" + setColor(d) +
                "></div></td><td>" + d.category +
                "</td><td><b>" + numberFormat(d.value) + "</td></tr>");
          }
          tooltip
            .html("<table><tbody>" + tooltipText + "</tbody></table>")
            .style("left", elementRect.left + (elementRect.width / 2) - (tooltip.property('clientWidth') / 2) + "px")
            .style("top", elementRect.top - tooltip.property('clientHeight') - 10 + "px")

        }

        function mouseleave() {
          tooltip
            .style("z-index", "-100")
            .style("opacity", 0)
        }

        function wrap(text, width) {
          var maxLines = Math.round(x.bandwidth()/15);
          text.each(function() {
            var text = d3.select(this),
              maxLinesTextSplited = Math.ceil(text.node().getComputedTextLength()/(width - 20)),
              words = text.text().split(/\s+/).reverse(),
              word,
              numberChar = Math.round((width -10)/4),
              line = [],
              lineNumber = 0,
              x = text.attr("x"),
              y = text.attr("y"),
              dy = options.offsetXAxisLabel,
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
                    tspan.text(line.join(" ").substring(0,numberChar - 3) + " ...");
                }
                continue;
              } else {
                tspan.text(line.join(" "));
              }

              if (tspan.node().getComputedTextLength() > width - 10) {
                line.pop();
                dy = 0.3 * Math.min(maxLinesTextSplited,maxLines)/2;
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

        function getWidth(text) {
          var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d');
          context.font = '10px Helvetica';
          return context.measureText(text).width;
        }

      }
      return {
        draw: draw
      }
    }]);

})
();
