console.log(runs);

function timeToMinutes(timeStr) {
  const parts = timeStr.split(":").map(Number);

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes + (seconds / 60);
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 60) + minutes + (seconds / 60);
  }

  return 0;
}

function formatPace(pace) {
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
const totalRuns = runs.length;
const longestRun = Math.max(...runs.map(run => run.distance));
const totalMinutes = runs.reduce((sum, run) => sum + timeToMinutes(run.time), 0);
const avgPace = totalMinutes / totalDistance;

document.getElementById("totalDistance").innerText = `${totalDistance.toFixed(2)} km`;
document.getElementById("avgPace").innerText = formatPace(avgPace);
document.getElementById("totalRuns").innerText = totalRuns;
document.getElementById("longestRun").innerText = `${longestRun.toFixed(2)} km`;

const sortedRuns = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));

function getFilteredRuns(period) {
  if (period === "7") return sortedRuns.slice(-7);
  if (period === "30") return sortedRuns.slice(-30);
  if (period === "90") return sortedRuns.slice(-90);
  return sortedRuns;
}

const distanceCtx = document.getElementById("distanceChart");
const paceCtx = document.getElementById("paceChart");

const distanceChart = new Chart(distanceCtx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "Distância (km)",
        data: []
      }
    ]
  },
  options: {
    responsive: true
  }
});

const paceChart = new Chart(paceCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Pace (min/km)",
        data: []
      }
    ]
  },
  options: {
    responsive: true
  }
});

function updateCharts(period) {
  const filteredRuns = getFilteredRuns(period);

  const labels = filteredRuns.map(run => formatDate(run.date));
  const distances = filteredRuns.map(run => run.distance);
  const paces = filteredRuns.map(run =>
    +(timeToMinutes(run.time) / run.distance).toFixed(2)
  );

  distanceChart.data.labels = labels;
  distanceChart.data.datasets[0].data = distances;
  distanceChart.update();

  paceChart.data.labels = labels;
  paceChart.data.datasets[0].data = paces;
  paceChart.update();
}

updateCharts("7");

document.querySelectorAll(".filtros button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const text = btn.innerText;

    if (text === "7 dias") updateCharts("7");
    if (text === "30 dias") updateCharts("30");
    if (text === "90 dias") updateCharts("90");
    if (text === "1 ano") updateCharts("365");
  });
});
