import * as filestack from 'filestack-js';

export const filestackClient = filestack.init(process.env.FILESTACK_API_KEY);
