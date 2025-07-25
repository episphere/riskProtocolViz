import "https://cdn.plot.ly/plotly-3.0.1.min.js"

function stepTo(p1,p2){
    return [ (p1[0]+p2[0])/2.,(p1[1]+p2[1])/2. ]
}


function step(points, corners,max_steps) {
    for (let steps = 0; steps < max_steps; steps++) {
        let startingPoints = points[steps];
        console.log(startingPoints)
        let next_points = [];
        startingPoints.forEach((p) => {
            corners.forEach((c) => next_points.push(stepTo(p, c)))
        })
        points.push(next_points);
    }
    console.log(points)
    points = points.flat()
    return points
}

let corners = [[0,0],[0,1],[1,0],[1,1]]
let points = [ [[0.5,0.5]] ]
points = step(points,corners,6)


let sqrt3 = Math.sqrt(3)
let sqrt2 = Math.sqrt(2)
let corners_tri = [[0,0],[1,0],[0.5,sqrt3/2]]
let points_tri = [ [[0.5,sqrt3/6]] ]
points_tri = step(points_tri,corners_tri,10)


const trace = {
    x: points.map(point => point[0]), // Extract x values
    y: points.map(point => point[1]), // Extract y values
    mode: 'markers', // Scatter plot
    type: 'scatter'
};
const layout = {
    title: 'X-Y Scatter Plot',
    xaxis: { title: 'X Axis' },
    yaxis: { title: 'Y Axis' }
};
Plotly.newPlot('square_plot', [trace], layout);

const trace2 = {
    x: points_tri.map(point => point[0]), // Extract x values
    y: points_tri.map(point => point[1]), // Extract y values
    mode: 'markers', // Scatter plot
    marker: {
        size:4
    },
    type: 'scatter'
};
const layout2 = {
    title: 'X-Y Scatter Plot',
    xaxis: { title: 'X Axis' },
    yaxis: { title: 'Y Axis' }
};
Plotly.newPlot('tri_plot', [trace2], layout2);