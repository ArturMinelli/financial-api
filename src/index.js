const { request, response } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid')

const app = express();

app.use(express.json());

const customers = [];

function verifyIfCustomerCPFExists(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf == cpf);

  if(!customer) {
    return res.status(404).json({error: "The requested customer is not registered."});
  }

  request.customer = customer;

  next();
}

function getBalance(statement) {
  const total = statement.reduce((accum, transaction) => {
    if(transaction.type === "credit") {
      return accum + transaction.amount;
    } else if(transaction.type === "debit") {
      return accum - transaction.amount;
    }
  }, 0);

  return total;
}

app.post('/account', (req, res) => {
  const {cpf, name} = req.body;

  const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf)
  if(customerAlreadyExists) {
    return res.status(400).json({error: "Customer already exists"})
  }

  customers.push({
    id: uuidv4(),
    name,
    cpf,
    statement: [],
  })

  return res.status(201).send()
});

app.get('/statement', verifyIfCustomerCPFExists, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer.statement);
});

app.post('/deposit', verifyIfCustomerCPFExists, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOpeartion = {
    description,
    amount,
    createdAt: new Date(),
    type: "credit"
  };

  customer.statement.push(statementOpeartion);

  res.status(201).send()
})

app.post('/withdraw', verifyIfCustomerCPFExists, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement)

  if(balance < amount) {
    return res.status(400).json({error: "Insufficient funds"})
  }

  const statementOpeartion = {
    amount,
    createdAt: new Date(),
    type: "debit"
  };

  customer.statement.push(statementOpeartion);

  res.status(201).send()

});

app.get('/statement/:date', verifyIfCustomerCPFExists, (req, res) => {
  const { date } = req.query;
  const { customer } = req;

  const formattedDate = new Date(date + " 00:00");

  const transactionsByDate = customer.statement.filter(
    (transaction) => transaction.createdAt.toDateString() === new Date(formattedDate).toDateString())

  return res.status(200).json(transactionsByDate)
})

app.put('/account', verifyIfCustomerCPFExists, (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  customer.name = name

  return res.status(201).send()
})

app.get('/account', verifyIfCustomerCPFExists, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer);
})

app.delete('/account', verifyIfCustomerCPFExists, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1)

  return res.status(202).send()
})

app.get('/balance', verifyIfCustomerCPFExists, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement)

  return res.status(200).json({balance});
})

app.listen(3333);