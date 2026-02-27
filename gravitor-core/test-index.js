import axios from "axios";

async function testIndex() {
    try {
        const payload = {
            text: "function calculateFibonacci(n) { if (n <= 1) return n; return calculateFibonacci(n-1) + calculateFibonacci(n-2); }",
            filename: "fibo.ts"
        };
        const response = await axios.post("http://localhost:3000/index", payload);
        console.log("Response:", response.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testIndex();
