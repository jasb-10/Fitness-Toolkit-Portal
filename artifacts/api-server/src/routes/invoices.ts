import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import {
  listUserInvoices,
  getStripeInvoicePdfUrl,
  generateLocalInvoicePdf,
} from "../lib/invoices";
import { recordActivity } from "../lib/activity";
import { isStripeConfigured } from "../lib/stripe";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/me/invoices", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const items = await listUserInvoices(ar.userId);
  res.json({
    stripeConfigured: isStripeConfigured(),
    items,
  });
});

router.get("/me/invoices/:invoiceId/download", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const source = req.query.source === "stripe" ? "stripe" : "local";
  const invoiceId = req.params.invoiceId!;

  void recordActivity({
    userId: ar.userId,
    action: "downloaded_invoice",
    target: invoiceId,
    metadata: { source },
  });

  if (source === "stripe") {
    const url = await getStripeInvoicePdfUrl(ar.userId, invoiceId);
    if (!url) return res.status(404).json({ error: "Invoice not found" });
    return res.redirect(302, url);
  }

  const pdf = await generateLocalInvoicePdf(ar.userId, invoiceId);
  if (!pdf) return res.status(404).json({ error: "Invoice not found" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${pdf.filename}"`,
  );
  res.send(pdf.buffer);
});

export default router;
