import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, getCustomers, getProducts, getSales } from '../services/api';

const productSales = [
  { name: 'Fresh Avocados Grade A', quantity: 46, revenue: 3910000, color: '#3d7639' },
  { name: 'Fresh Avocados Grade B', quantity: 31, revenue: 1922000, color: '#22c55e' },
  { name: 'Frozen Avocado Pulp', quantity: 96, revenue: 1152000, color: '#14b8a6' },
  { name: 'Frozen Avocado Cubes', quantity: 42, revenue: 609000, color: '#2563eb' },
  { name: 'Apples Premium Box', quantity: 17, revenue: 918000, color: '#f59e0b' },
  { name: 'Apples Standard Box', quantity: 22, revenue: 924000, color: '#eab308' }
];

const stockMovement = [
  { product: 'Fresh Avocados Grade A', opening: 65, received: 23, sold: 46, closing: 42 },
  { product: 'Fresh Avocados Grade B', opening: 42, received: 7, sold: 31, closing: 18 },
  { product: 'Frozen Avocado Pulp', opening: 140, received: 52, sold: 96, closing: 96 },
  { product: 'Frozen Avocado Cubes', opening: 58, received: 18, sold: 42, closing: 34 },
  { product: 'Apples Premium Box', opening: 28, received: 1, sold: 17, closing: 12 },
  { product: 'Apples Standard Box', opening: 41, received: 10, sold: 22, closing: 29 }
];

function parseSaleDate(date: string) {
  return new Date(date).getTime() || 0;
}

export function ReportsPage() {
  const sales = getSales();
  const products = getProducts();
  const customers = getCustomers();
  const latestSaleTime = Math.max(...sales.map((sale) => parseSaleDate(sale.date)));
  const latestDate = new Date(latestSaleTime);
  const weekStart = latestSaleTime - 6 * 24 * 60 * 60 * 1000;

  const dailySales = sales.filter((sale) => parseSaleDate(sale.date) === latestSaleTime).reduce((sum, sale) => sum + sale.amount, 0);
  const weeklySales = sales.filter((sale) => parseSaleDate(sale.date) >= weekStart).reduce((sum, sale) => sum + sale.amount, 0);
  const monthlySales = sales
    .filter((sale) => {
      const saleDate = new Date(parseSaleDate(sale.date));
      return saleDate.getMonth() === latestDate.getMonth() && saleDate.getFullYear() === latestDate.getFullYear();
    })
    .reduce((sum, sale) => sum + sale.amount, 0);

  const currentStockValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);
  const outstandingCustomers = customers.filter((customer) => customer.balance > 0);
  const outstandingBalances = outstandingCustomers.reduce((sum, customer) => sum + customer.balance, 0);
  const bestSellingProducts = [...productSales].sort((a, b) => b.quantity - a.quantity);
  const paymentSummary = ['Cash', 'Mobile Money', 'Card', 'Credit'].map((payment) => {
    const matchingSales = sales.filter((sale) => sale.payment === payment);
    return {
      name: payment,
      count: matchingSales.length,
      value: matchingSales.reduce((sum, sale) => sum + sale.amount, 0)
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Sales, stock, balances, and payment summaries for management review." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Daily sales', dailySales],
          ['Weekly sales', weeklySales],
          ['Monthly sales', monthlySales],
          ['Current stock value', currentStockValue]
        ].map(([label, value]) => (
          <section className="card px-4 py-3" key={label}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 font-heading text-xl font-bold text-slate-950">{formatMoney(Number(value))}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-heading text-base font-bold text-slate-950">Sales by product</h3>
            <span className="text-xs font-bold text-slate-400">May 2026</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productSales}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={0} height={62} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1000000}M`} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {productSales.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <aside className="card p-4">
          <h3 className="font-heading text-base font-bold text-slate-950">Best-selling products</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {bestSellingProducts.slice(0, 5).map((product, index) => (
              <div className="flex items-center justify-between gap-3 py-3 text-xs font-bold" key={product.name}>
                <div className="min-w-0">
                  <p className="truncate text-slate-950">{index + 1}. {product.name}</p>
                  <p className="mt-0.5 text-slate-500">{formatMoney(product.revenue)}</p>
                </div>
                <StatusBadge tone="green">{`${product.quantity} sold`}</StatusBadge>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="font-heading text-base font-bold text-slate-950">Stock movement</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  {['Product', 'Opening', 'Received', 'Sold', 'Closing'].map((head) => (
                    <th className="table-header px-4 py-3" key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockMovement.map((item) => (
                  <tr className="border-b border-slate-100 text-xs font-semibold" key={item.product}>
                    <td className="px-4 py-3 font-bold text-slate-950">{item.product}</td>
                    <td className="px-4 py-3">{item.opening}</td>
                    <td className="px-4 py-3 text-green-700">{item.received}</td>
                    <td className="px-4 py-3 text-amber-700">{item.sold}</td>
                    <td className="px-4 py-3 font-bold">{item.closing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="font-heading text-base font-bold text-slate-950">Outstanding customer balances</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Total outstanding: {formatMoney(outstandingBalances)}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {outstandingCustomers.map((customer) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-xs font-semibold" key={customer.id}>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{customer.name}</p>
                  <p className="mt-0.5 text-slate-500">{customer.type}</p>
                </div>
                <p className="font-bold text-amber-700">{formatMoney(customer.balance)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="card p-4">
          <h3 className="font-heading text-base font-bold text-slate-950">Payment summaries</h3>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={paymentSummary} innerRadius={58} outerRadius={92} dataKey="value" paddingAngle={3}>
                {['#3d7639', '#22c55e', '#2563eb', '#f59e0b'].map((color) => <Cell key={color} fill={color} />)}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="font-heading text-base font-bold text-slate-950">Payment detail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  {['Method', 'Transactions', 'Value', 'Share'].map((head) => (
                    <th className="table-header px-4 py-3" key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentSummary.map((payment) => (
                  <tr className="border-b border-slate-100 text-xs font-semibold" key={payment.name}>
                    <td className="px-4 py-3 font-bold text-slate-950">{payment.name}</td>
                    <td className="px-4 py-3">{payment.count}</td>
                    <td className="px-4 py-3">{formatMoney(payment.value)}</td>
                    <td className="px-4 py-3">{monthlySales ? Math.round((payment.value / monthlySales) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
