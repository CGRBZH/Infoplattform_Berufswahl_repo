data_URL = "https://raw.githubusercontent.com/CGRBZH/Infoplattform_Berufswahl_repo/main/Master_Studienwahl.csv";

d3.csv(data_URL).then((data) => {
  let accessor = {
    schoolType: (d) => d.Kategorie,
    studyField: (d) => d.Fachbereich,
    year: (d) => +d.Jahr,
    maleCount: (d) => +d.Mann,
    femaleCount: (d) => +d.Frau,
    malePercentage: (d) => +d.Mann_Proz,
    femalePercentage: (d) => +d.Frau_Proz,
    totalCount: (d) => +d.Total,
  };

  // Set up controls
  let schoolTypeOptions = Array.from(new Set(data.map(accessor.schoolType)));
  let sortingOptions = [
    "Alphabetisch",
    "Anteil Männer",
    "Anteil Frauen",
  ];
  let yearOptions = Array.from(new Set(data.map(accessor.year)));

  let selected = {
    schoolType: schoolTypeOptions[0],
    sorting: sortingOptions[0],
    year: yearOptions[yearOptions.length - 1],
  };

  let dispatch = d3.dispatch("selectedchange");

  setupSchoolTypeControl(
    d3.select("#school-type-control"),
    schoolTypeOptions,
    selected.schoolType,
    dispatch
  );

  setupSortingControl(
    d3.select("#sorting-select"),
    sortingOptions,
    selected.sorting,
    dispatch
  );

  setupYearControl(
    d3.select("#year-control"),
    yearOptions,
    selected.year,
    dispatch
  );

  // Render legend
  let color = d3
    .scaleOrdinal()
    .domain(["Männer", "Frauen"])
    .range(["#24B39C", "#6C43C0"]);

  renderLegend(d3.select("#color-legend"), color);

  // Render chart
  const tooltip = setupTooltip(d3.select("#tooltip"));

  const stackedBarChart = renderStackedBarChart(
    d3.select("#stacked-bar-chart"),
    data,
    selected,
    color,
    tooltip
  );

  dispatch.on("selectedchange", stackedBarChart.onSelectedChange);

  function setupSchoolTypeControl(
    container,
    options,
    initialSelection,
    dispatch
  ) {
    let formCheck = container
      .selectAll("div")
      .data(options)
      .join("div")
      .attr("class", "form-check form-check-inline");
    formCheck
      .append("input")
      .attr("class", "form-check-input")
      .attr("type", "radio")
      .attr("name", "school-type-radios")
      .attr("id", (d, i) => `school-type-radio-${i + 1}`)
      .attr("value", (d) => d)
      .attr("checked", (d) => (d === initialSelection ? "checked" : null))
      .on("change", function () {
        dispatch.call("selectedchange", this, {
          key: "schoolType",
          value: this.value,
        });
      });
    formCheck
      .append("label")
      .attr("class", "form-check-label")
      .attr("for", (d, i) => `school-type-radio-${i + 1}`)
      .text((d) => d);
  }

  function setupSortingControl(select, options, initialSelection, dispatch) {
    select
      .on("change", function () {
        dispatch.call("selectedchange", this, {
          key: "sorting",
          value: this.value,
        });
      })
      .selectAll("option")
      .data(options)
      .join("option")
      .attr("value", (d) => d)
      .attr("selected", (d) => (d === initialSelection ? "selected" : null))
      .text((d) => d);
  }

  function setupYearControl(container, options, initialSelection, dispatch) {
    let selectedYear = initialSelection;
    container.classed("d-flex align-items-center", true);
    let prevYear = container
      .append("button")
      .attr("class", "btn btn-outline-primary btn-sm")
      .attr("disabled", selectedYear === options[0] ? "disabled" : null)
      .text("<<")
      .on("click", function () {
        selectedYear--;
        updateUI();
        dispatch.call("selectedchange", this, {
          key: "year",
          value: selectedYear,
        });
      });
    let yearLabel = container
      .append("div")
      .attr("class", "mx-2")
      .text(selectedYear);
    let nextYear = container
      .append("button")
      .attr("class", "btn btn-outline-primary btn-sm")
      .attr(
        "disabled",
        selectedYear === options[options.length - 1] ? "disabled" : null
      )
      .text(">>")
      .on("click", function () {
        selectedYear++;
        updateUI();
        dispatch.call("selectedchange", this, {
          key: "year",
          value: selectedYear,
        });
      });

    function updateUI() {
      prevYear.attr(
        "disabled",
        selectedYear === options[0] ? "disabled" : null
      );
      nextYear.attr(
        "disabled",
        selectedYear === options[options.length - 1] ? "disabled" : null
      );
      yearLabel.text(selectedYear);
    }
  }

  function renderLegend(container, color) {
    let legendItem = container
      .classed("items d-flex", true)
      .selectAll(".item")
      .data(color.domain())
      .join("div")
      .attr("class", "item d-flex align-items-center mr-4");
    legendItem
      .append("div")
      .attr("class", "swatch mr-2")
      .style("width", "14px")
      .style("height", "14px")
      .style("background-color", (d) => color(d));
    legendItem
      .append("div")
      .attr("class", "label text-capitalize")
      .text((d) => d);
  }

  function setupTooltip(tooltip) {
    let width, height;

    function show(html) {
      tooltip.html(html).transition().style("opacity", 1);
      ({ width, height } = tooltip.node().getBoundingClientRect());
    }

    function hide() {
      tooltip.transition().style("opacity", 0);
    }

    function move(event) {
      let tx = event.pageX - width / 2;
      if (tx < 0) tx = 0;
      if (tx > window.innerWidth - width) tx = window.innerWidth - width;
      let ty = event.pageY - height - 4;
      tooltip.style("transform", `translate(${tx}px,${ty}px)`);
    }

    return {
      show,
      hide,
      move,
    };
  }

  function renderStackedBarChart(
    container,
    data,
    initialSelections,
    color,
    tooltip
  ) {
    let selected = initialSelections;
    let filteredData, displayData;

    let margin = {
      top: 24,
      right: 16,
      bottom: 24,
      left: 8,
    };
    let rowHeight = 48;
    let barHeight = 20;
    let width, height;

    let x = d3.scaleLinear().domain([0, 1]);
    let y = d3.scalePoint().padding(0.5);

    let stack = d3
      .stack()
      .keys(["malePercentage", "femalePercentage"])
      .value((d, key) => accessor[key](d));

    const formatPercentage = d3.format(".0%");

    let svg = container.append("svg");
    let g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    let gxTop = g.append("g");
    let gxBottom = g.append("g");
    let gBars = g.append("g");

    window.addEventListener("resize", resize);
    resize();
    wrangleData();

    function resize() {
      width = container.node().clientWidth - margin.left - margin.right;
      x.range([0, width]);
      svg.attr("width", width + margin.left + margin.right);
      if (displayData) update();
    }

    function wrangleData() {
      filteredData = data.filter(
        (d) =>
          accessor.schoolType(d) === selected.schoolType &&
          accessor.year(d) === selected.year
      );
      displayData = filteredData.sort((a, b) => {
        switch (selected.sorting) {
          case "Alphabetisch":
            return d3.ascending(accessor.studyField(a), accessor.studyField(b));
          case "Anteil Männer":
            return d3.descending(
              accessor.malePercentage(a),
              accessor.malePercentage(b)
            );
          case "Anteil Frauen":
            return d3.descending(
              accessor.femalePercentage(a),
              accessor.femalePercentage(b)
            );
        }
      });
      update();
    }

    function update() {
      height = rowHeight * displayData.length;
      y.domain(displayData.map(accessor.studyField)).range([0, height]);
      svg.attr("height", height + margin.top + margin.bottom);
      gxTop
        .call(
          d3
            .axisTop(x)
            .ticks(width / 80, ".0%")
            .tickSizeOuter(0)
        )
        .call((g) => g.selectAll(".tick line").attr("y1", height));
      gxBottom.attr("transform", `translate(0,${height})`).call(
        d3
          .axisBottom(x)
          .ticks(width / 80, ".0%")
          .tickSizeOuter(0)
      );

      let gBar = gBars
        .selectAll(".row-group")
        .data(
          displayData,
          (d) => `${accessor.schoolType(d)}-${accessor.studyField(d)}}`
        )
        .join((enter) =>
          enter
            .append("g")
            .attr("class", "row-group")
            .attr(
              "transform",
              (d) => `translate(0,${y(accessor.studyField(d))})`
            )
            .call((g) =>
              g
                .append("text")
                .attr("class", "row-label")
                .attr("y", -4)
                .text(accessor.studyField)
            )
            .call((g) => g.append("g").attr("class", "bars"))
            .on("mouseenter", function (event, d) {
              let html = `
                <div>${accessor.studyField(d)}</div>
                <table>
                  <tbody>
                    <tr>
                      <td>Männer: </td>
                      <td>${formatPercentage(accessor.malePercentage(d))}</td>
                      <td>${accessor.maleCount(d).toLocaleString("de-CH", { thousands: "'" })}/${
                accessor.totalCount(d).toLocaleString("de-CH", { thousands: "'" })
              }</td>
                    </tr>
                    <tr>
                      <td>Frauen: </td>
                      <td>${formatPercentage(accessor.femalePercentage(d))}</td>
                      <td>${accessor.femaleCount(d).toLocaleString("de-CH", { thousands: "'" })}/${
                      	accessor.totalCount(d).toLocaleString("de-CH", { thousands: "'" })
              }</td>
                    </tr>
                  </tbody>
                </table>
              `;
              tooltip.show(html);
              d3.select(this).selectAll(".bar").attr("stroke", "#e3e4e9");
            })
            .on("mouseleave", function () {
              tooltip.hide();
              d3.select(this).selectAll(".bar").attr("stroke", null);
            })
            .on("mousemove", tooltip.move)
        );

      gBar
        .select(".bars")
        .selectAll(".bar")
        .data((d) => stack([d]))
        .join((enter) =>
          enter
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => x(d[0][0]))
            .attr("y", 0)
            .attr("width", (d) => x(d[0][1]) - x(d[0][0]))
            .attr("height", barHeight)
            .attr("fill", (d) => color(["Männer", "Frauen"][d.index]))
        );

      gBar
        .transition()
        .duration(500)
        .attr("transform", (d) => `translate(0,${y(accessor.studyField(d))})`)
        .select(".bars")
        .selectAll(".bar")
        .attr("x", (d) => x(d[0][0]))
        .attr("width", (d) => x(d[0][1]) - x(d[0][0]));
    }

    function onSelectedChange({ key, value }) {
      selected[key] = value;
      wrangleData();
    }

    return {
      onSelectedChange,
    };
  }
});
