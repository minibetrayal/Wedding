import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { formatMarkdownLinks } from '../util/markdownLinkFormatter';

const router = express.Router();

router.get('/', async (_req, res, next) => {
    try {
        const faqs = await dataConnection().faq.getAll();
        res.render('pages/faq', { faqs: faqs.map(faq => ({
            ...faq,
            formatted: formatMarkdownLinks(faq.answer)
        })) });
    } catch (err) {
        next(err);
    }
});

export default router;
