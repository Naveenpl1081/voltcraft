(function ($) {
    "use strict";
  

    function fetchDataAndUpdateChart(filter,time){
        console.log('entering fetchDataAndUpdateChart');
        $.ajax({
            url: '/admin/graph',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(
                {
                    filter,
                    time
                }
            ),
            success: function(response) {
                console.log("This is response",response);
              
                // Update chart with new data
                chart.data.labels = response.labels;
                chart.data.datasets[0].data = response.salesData;
                chart.data.datasets[1].data = response.revenueData;
                chart.data.datasets[2].data = response.productsData;
    
                // Update chart
                chart.update();
            },
            error: function(xhr, status, error) {
                console.error('Error fetching data from backend:', error);
            }
        });
    }





    /*Sale statistics Chart*/
    if ($('#myChart').length) {
        var ctx = document.getElementById('myChart').getContext('2d');
        var chart = new Chart(ctx, {
           
            type: 'line',
            
           
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                        label: 'Sales',
                        tension: 0.3,
                        fill: true,
                        backgroundColor: 'rgba(44, 120, 220, 0.2)',
                        borderColor: 'rgba(44, 120, 220)',
                        data: [18, 17, 4, 3, 2, 20, 25, 31, 25, 22, 20, 9]
                    },
                    {
                        label: 'Revenue',
                        tension: 0.3,
                        fill: true,
                        backgroundColor: 'rgba(4, 209, 130, 0.2)',
                        borderColor: 'rgb(4, 209, 130)',
                        data: [40, 20, 17, 9, 23, 35, 39, 30, 34, 25, 27, 17]
                    },
                    {
                        label: 'Products',
                        tension: 0.3,
                        fill: true,
                        backgroundColor: 'rgba(380, 200, 230, 0.2)',
                        borderColor: 'rgb(380, 200, 230)',
                        data: [30, 10, 27, 19, 33, 15, 19, 20, 24, 15, 37, 6]
                    }

                ]
            },
            options: {
                plugins: {
                legend: {
                    labels: {
                    usePointStyle: true,
                    },
                }
                }
            }
        });

        fetchDataAndUpdateChart("yearly",2024);
    } 
    
    const yearlyBtn = document.getElementById("yearlyBtn");
    const monthlyBtn = document.getElementById("monthlyBtn");
    yearlyBtn.addEventListener("click", (e)=>{
        e.stopPropagation();
        const time = document.getElementById("time").value;
        fetchDataAndUpdateChart("yearly",time);
    })
    monthlyBtn.addEventListener("click", (e)=>{
        e.stopPropagation();
        const time = document.getElementById("time").value;
        fetchDataAndUpdateChart("monthly",time);
    })

    /*Sale statistics Chart*/
    if ($('#myChart2').length) {
        var ctx = document.getElementById("myChart2");
        var myChart = new Chart(ctx, {
            type: 'bar',
            data: {
            labels: ["900", "1200", "1400", "1600"],
            datasets: [
                {
                    label: "US",
                    backgroundColor: "#5897fb",
                    barThickness:10,
                    data: [233,321,783,900]
                }, 
                {
                    label: "Europe",
                    backgroundColor: "#7bcf86",
                    barThickness:10,
                    data: [408,547,675,734]
                },
                {
                    label: "Asian",
                    backgroundColor: "#ff9076",
                    barThickness:10,
                    data: [208,447,575,634]
                },
                {
                    label: "Africa",
                    backgroundColor: "#d595e5",
                    barThickness:10,
                    data: [123,345,122,302]
                },
            ]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                        usePointStyle: true,
                        },
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } //end if
    
})(jQuery);