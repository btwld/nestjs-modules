import { type Readable } from 'stream';
import { type Url } from 'url';

import { type LiteralObject } from '../../../utils/interfaces/literal-object.interface';

interface Address {
  name: string;
  address: string;
}

interface IcalAttachment {
  method?: string;
  filename?: string | false;
  href?: string;
  encoding?: string;
  content?: string | Buffer | Readable;
  path?: string | Url;
}

export interface EmailSendOptionsInterface {
  to?: string | Address | Array<string | Address>;
  cc?: string | Address | Array<string | Address>;
  bcc?: string | Address | Array<string | Address>;
  from?: string | Address;
  replyTo?: string | Address;
  context?: LiteralObject;
  subject?: string;
  template?: string;
  icalEvent?: string | Buffer | Readable | IcalAttachment;
}
