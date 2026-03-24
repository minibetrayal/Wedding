import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';

const router = express.Router();

function parseBody(body: unknown): {
    names: string;
    namesShort: string;
    contactName: string;
    contactPhone: string;
} {
    const raw = body as Record<string, unknown>;
    return {
        names: typeof raw.names === 'string' ? raw.names.trim() : '',
        namesShort: typeof raw.namesShort === 'string' ? raw.namesShort.trim() : '',
        contactName: typeof raw.contactName === 'string' ? raw.contactName.trim() : '',
        contactPhone: typeof raw.contactPhone === 'string' ? raw.contactPhone.trim() : '',
    };
}

router.get('/', async (req, res, next) => {
    try {
        const names = dataConnection().names;
        const [fullNames, shortNames, contactName, contactPhone] = await Promise.all([
            names.getNames(),
            names.getNamesShort(),
            names.getContactName(),
            names.getContactPhone(),
        ]);
        res.render('pages/admin/names', {
            names: fullNames,
            namesShort: shortNames,
            contactName,
            contactPhone,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    const parsed = parseBody(req.body);
    try {
        const names = dataConnection().names;
        await names.setNames(parsed.names);
        await names.setNamesShort(parsed.namesShort);
        await names.setContactName(parsed.contactName);
        await names.setContactPhone(parsed.contactPhone);
        req.flash('success', 'Names and contact details updated.');
        res.redirect(302, '/admin/names');
    } catch (err) {
        next(err);
    }
});

export default router;
