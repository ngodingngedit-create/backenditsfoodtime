import { supabaseAdmin } from '../utils/supabase.js'
import { snap } from '../utils/midtrans.js'

export default async function (req, res) {
    try {
        const { customer, items } = req.body

        // VALIDASI
        if (!customer || !items || items.length === 0) {
            return res.status(400).json({ message: 'Data tidak lengkap' })
        }

        // AMBIL PRODUK DARI DB
        const productIds = items.map(i => i.product_id)

        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .in('product_id', productIds)

        if (error) throw error

        let total = 0

        const detailedItems = items.map(item => {
            const product = products.find(p => p.product_id === item.product_id)

            if (!product) throw new Error('Produk tidak ditemukan')

            const subtotal = product.price * item.qty
            total += subtotal

            return {
                id: item.product_id,
                name: product.name,
                price: product.price,
                quantity: item.qty,
                subtotal
            }
        })

        // INSERT CUSTOMER
        const { data: customerData } = await supabaseAdmin
            .from('customers')
            .insert([customer])
            .select()
            .single()

        // BUAT INVOICE
        const invoice = `INV-${Date.now()}`

        // INSERT TRANSACTION
        const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .insert([{
                invoice_number: invoice,
                customer_id: customerData.customer_id,
                phone: customer.phone,
                email: customer.email,
                payment_status: 'pending',
                payment_method: 'midtrans'
            }])
            .select()
            .single()

        // MIDTRANS REQUEST
        const midtransRes = await snap.createTransaction({
            transaction_details: {
                order_id: invoice,
                gross_amount: total
            },
            customer_details: {
                first_name: customer.name,
                email: customer.email,
                phone: customer.phone
            },
            item_details: detailedItems.map(item => ({
                id: item.id,
                price: item.price,
                quantity: item.quantity,
                name: item.name
            }))
        })

        // UPDATE TRANSACTION DENGAN MIDTRANS DATA
        await supabaseAdmin
            .from('transactions')
            .update({
                midtrans_token: midtransRes.token,
                midtrans_redirect_url: midtransRes.redirect_url
            })
            .eq('transaction_id', transaction.transaction_id)

        return res.json({
            success: true,
            token: midtransRes.token,
            redirect_url: midtransRes.redirect_url
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: err.message })
    }
}