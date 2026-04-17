import { supabaseAdmin } from '../utils/supabase.js'

export default async (req, res) => {
    try {
        const body = req.body
        const { order_id, transaction_status } = body

        await supabaseAdmin
            .from('transactions')
            .update({
                payment_status: transaction_status
            })
            .eq('invoice_number', order_id)

        return res.json({ success: true })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ success: false, message: err.message })
    }
}