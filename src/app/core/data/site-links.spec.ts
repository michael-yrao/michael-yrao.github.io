import { COACH_OWNER_LOGIN, isCoachOwner } from './site-links';

describe('isCoachOwner', () => {
  it.each([
    { name: 'exact login', login: COACH_OWNER_LOGIN, expected: true },
    { name: 'different case', login: COACH_OWNER_LOGIN.toUpperCase(), expected: true },
    { name: 'other login', login: 'visitor', expected: false },
    { name: 'empty string', login: '', expected: false },
    { name: 'null', login: null, expected: false },
    { name: 'undefined', login: undefined, expected: false },
  ])('$name: $expected', ({ login, expected }) => {
    expect(isCoachOwner(login)).toBe(expected);
  });
});
