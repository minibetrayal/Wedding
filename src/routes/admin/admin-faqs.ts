import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { DbNotFoundError } from '../../data/dbErrors';
import { formatMarkdownLinks } from '../../util/markdownLinkFormatter';

const router = express.Router();

router.get('/', async (_req, res, next) => {
    try {
        const faqs = await dataConnection().faq.getAll();
        res.render('pages/admin/admin-faq', { faqs: faqs.map(faq => ({
            ...faq,
            formatted: formatMarkdownLinks(faq.answer)
        })) });
    } catch (err) {
        next(err);
    }
});

router.get('/new', (_req, res) => {
    res.render('pages/admin/admin-faq-edit', {
        isNew: true,
        faq: { question: '', answer: '' },
    });
});

router.post('/new', async (req, res, next) => {
    try {
        const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
        const answer = typeof req.body.answer === 'string' ? req.body.answer.trim() : '';
        if (!question) {
            req.flash('error', 'Question is required.');
            return res.redirect(302, '/admin/faq/new');
        }
        if (!answer) {
            req.flash('error', 'Answer is required.');
            return res.redirect(302, '/admin/faq/new');
        }
        const created = await dataConnection().faq.create(question, answer);
        req.flash('success', 'FAQ created.');
        res.redirect(302, `/admin/faq`);
    } catch (err) {
        next(err);
    }
});

router.get('/:faqId/edit', async (req, res, next) => {
    const id = req.params.faqId;
    try {
        const faq = await dataConnection().faq.get(id);
        res.render('pages/admin/admin-faq-edit', { isNew: false, faq });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'FAQ not found.');
            return res.redirect(302, '/admin/faq');
        }
        next(err);
    }
});

router.post('/:faqId/edit', async (req, res, next) => {
    const id = req.params.faqId;
    try {
        const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
        const answer = typeof req.body.answer === 'string' ? req.body.answer.trim() : '';
        if (!question) {
            req.flash('error', 'Question is required.');
            return res.redirect(302, `/admin/faq/${id}/edit`);
        }
        if (!answer) {
            req.flash('error', 'Answer is required.');
            return res.redirect(302, `/admin/faq/${id}/edit`);
        }
        await dataConnection().faq.update(id, question, answer);
        req.flash('success', 'FAQ updated.');
        res.redirect(302, `/admin/faq`);
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'FAQ not found.');
            return res.redirect(302, '/admin/faq');
        }
        next(err);
    }
});

router.post('/:faqId/delete', async (req, res, next) => {
    const id = req.params.faqId;
    try {
        await dataConnection().faq.delete(id);
        req.flash('success', 'FAQ deleted.');
        res.redirect(302, '/admin/faq');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'FAQ not found.');
            return res.redirect(302, '/admin/faq');
        }
        next(err);
    }
});

router.post('/:faqId/move', async (req, res, next) => {
    const direction = req.query.d as string;
    const id = req.params.faqId;
    const wantsJson = req.get('X-Requested-With') === 'fetch';
    if (direction !== 'up' && direction !== 'down') {
        if (wantsJson) return res.status(400).json({ ok: false, error: 'Invalid direction.' });
        req.flash('error', 'Invalid move.');
        return res.redirect(302, '/admin/faq');
    }
    try {
        await dataConnection().faq.move(id, direction as 'up' | 'down');
        if (wantsJson) return res.json({ ok: true });
        req.flash('success', `FAQ moved ${direction}.`);
        res.redirect(302, '/admin/faq');
    } catch (err) {
        if (wantsJson) {
            if (err instanceof DbNotFoundError) {
                return res.status(404).json({ ok: false, error: err.message });
            }
            console.error(err);
            return res.status(500).json({ ok: false, error: 'Server error.' });
        }
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'FAQ not found.');
            return res.redirect(302, '/admin/faq');
        }
        next(err);
    }
});

export default router;
