const express = require('express');
const app =express()
const path=require('path')
const sqlite=require('sqlite')
const {open}=sqlite
const sqlite3 = require('sqlite3')

const dbPath = path.join(__dirname, "transactions.db");
app.use(express.json());
let db = null;
const PORT = process.env.PORT || 3005;


const initializeDbAndServer = async () => {
    try {
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
  
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } catch (e) {
      console.error("Error initializing database:", e.message);
      process.exit(1);
    }
  };
  
  initializeDbAndServer();


app.get('/api-test',async(req,res)=>{
    
    res.json('api success')
})

app.get('/transactions', async (req, res) => {
    const { search, page = 1, perPage = 10 ,month='03'} = req.query;
    const offset = (page - 1) * perPage;
    console.log(page)
    let query = 'SELECT * FROM transactions WHERE 1=1';

    
    if (search) {
        query += ` AND (title LIKE '%${search}%' OR description LIKE '%${search}%' OR price LIKE '%${search}%')`;
    }
    
    query += ` AND strftime('%m', dateOfSale) = '${month}'`;
    

    const totalResponse= await db.all(query)
    const totalItems=totalResponse.length
    console.log(totalItems)

    query += ` LIMIT ${perPage} OFFSET ${offset}`;


        const dbResponse = await db.all(query);
        res.json({data:dbResponse,totalItems});
    
});

app.get('/statistics/:month', async (req, res) => {
    const { month='03' } = req.params; 

   
    const query = `
        SELECT
            SUM(CASE WHEN sold = 1 THEN price ELSE 0 END) AS totalSaleAmount,
            COUNT(CASE WHEN sold = 1 THEN 1 END) AS totalSoldItems,
            COUNT(CASE WHEN sold = 0 THEN 1 END) AS totalUnsoldItems
        FROM
            transactions
        WHERE
            strftime('%m', dateOfSale) = ?
    `;
        const result = await db.get(query, [month]);     
        res.json(result);
    
});

app.get('/bar-chart/:month', async (req, res) => {
    let { month='03' } = req.params; 
    
    const query = `
        SELECT
            CASE
                WHEN price BETWEEN 0 AND 100 THEN '0 - 100'
                WHEN price BETWEEN 101 AND 200 THEN '101 - 200'
                WHEN price BETWEEN 201 AND 300 THEN '201 - 300'
                WHEN price BETWEEN 301 AND 400 THEN '301 - 400'
                WHEN price BETWEEN 401 AND 500 THEN '401 - 500'
                WHEN price BETWEEN 501 AND 600 THEN '501 - 600'
                WHEN price BETWEEN 601 AND 700 THEN '601 - 700'
                WHEN price BETWEEN 701 AND 800 THEN '701 - 800'
                WHEN price BETWEEN 801 AND 900 THEN '801 - 900'
                ELSE '901-above'
            END AS priceRange,
            COUNT(*) AS itemCount
        FROM
            transactions
        WHERE
            strftime('%m', dateOfSale) = ?
        GROUP BY
            priceRange
        ORDER BY
            MIN(price)
    `;
        const result = await db.all(query, [month]);
        res.json(result);
   
});


app.get('/pie-chart-data/:month', async (req, res) => {
    const { month='03' } = req.params;
    const pieChartData = await db.all(`
            SELECT category, COUNT(*) AS itemCount
            FROM transactions
            WHERE strftime('%m', dateOfSale) = ?
            GROUP BY category
        `, [month]);
         const formattedPieChartData = {};
        pieChartData.forEach(({ category, itemCount }) => {
            formattedPieChartData[category] = itemCount;
        });
       res.json(formattedPieChartData);
   
});


app.get('/combined-data/:month', async (req, res) => {
    const { month='03' } = req.params;
         const [totalStatistics, barChartData, pieChartData] = await Promise.all([
            axios.get(`http://localhost:${PORT}/statistics/${month}`),
            axios.get(`http://localhost:${PORT}/bar-chart-data/${month}`),
            axios.get(`http://localhost:${PORT}/pie-chart-data/${month}`)
        ]);
     const combinedData = {
            totalStatistics: totalStatistics.data,
            barChartData: barChartData.data,
            pieChartData: pieChartData.data
        };

        
        res.json(combinedData);
   
});