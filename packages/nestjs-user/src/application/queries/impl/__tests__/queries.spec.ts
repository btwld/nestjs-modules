import { GetUserByEmailQuery } from '../get-user-by-email.query.js';
import { GetUserBySubjectQuery } from '../get-user-by-subject.query.js';
import { GetUserByUsernameQuery } from '../get-user-by-username.query.js';
import { GetUserQuery } from '../get-user.query.js';

describe(GetUserQuery.name, () => {
  it('should store ctx and id', () => {
    const query = new GetUserQuery({}, 'user-1');
    expect(query.id).toBe('user-1');
  });
});

describe(GetUserByEmailQuery.name, () => {
  it('should store ctx and email', () => {
    const query = new GetUserByEmailQuery({}, 'a@b.com');
    expect(query.email).toBe('a@b.com');
  });
});

describe(GetUserByUsernameQuery.name, () => {
  it('should store ctx and username', () => {
    const query = new GetUserByUsernameQuery({}, 'john');
    expect(query.username).toBe('john');
  });
});

describe(GetUserBySubjectQuery.name, () => {
  it('should store ctx and subject', () => {
    const query = new GetUserBySubjectQuery({}, 'sub-1');
    expect(query.subject).toBe('sub-1');
  });
});
