// Owns the problem a host holds: the newest signed revision, and the chain that numbers and signs every change in arrival order.
import { HostKeys, signProblemAt, verifyProblem } from '../crypto/host-key';
import { InterviewProblem, SignedProblem, parseInterviewProblem } from '../interview-problem';

/** The revision a host with no problem holds: below every signed one. */
const NO_PROBLEM_REV = 0;

export interface HostProblemHooks {
  /** True once the host closed: nothing more is signed or published. */
  isClosed(): boolean;
  /** `signed` is now the held problem: the host tells its tab and every ready participant. */
  onPublished(signed: SignedProblem, problem: InterviewProblem): void;
}

export class HostProblem {
  /** The newest problem, signed by the interviewer key; changed only inside the chain. */
  private signed: SignedProblem | null;
  /** Every change to the problem runs through this chain, so revisions are assigned in arrival order. */
  private chain: Promise<void> = Promise.resolve();

  constructor(
    initial: SignedProblem | null,
    private readonly keys: HostKeys,
    private readonly sessionId: string,
    private readonly hooks: HostProblemHooks,
  ) {
    this.signed = initial;
  }

  /** The problem as the host holds it, or null before there is one. */
  get current(): SignedProblem | null {
    return this.signed;
  }

  /** The hosting tab's own edit: validated, then signed and published in turn with every other change. */
  editLocal(problem: InterviewProblem): Promise<void> {
    const valid = parseInterviewProblem(problem);
    if (valid === null) {
      console.error('Interview host: dropped a local problem edit that is not a valid problem');
      return Promise.resolve();
    }
    return this.enqueue(() => this.publishEdit(valid));
  }

  /** An interviewer's edit that already passed `parseInterviewProblem` on the wire. */
  editRemote(problem: InterviewProblem): void {
    void this.enqueue(() => this.publishEdit(problem));
  }

  /**
   * A hello's problem is taken only when its revision is higher than the held one and the interviewer key signed
   * it for this session. Runs in the chain, so it never interleaves with an edit being signed. The hello is
   * admitted either way.
   */
  adoptFromHello(signed: SignedProblem | undefined): Promise<void> {
    if (signed === undefined) {
      return Promise.resolve();
    }
    return this.enqueue(async () => {
      if (this.hooks.isClosed() || signed.rev <= this.heldRev()) {
        return;
      }
      const problem = await verifyProblem(this.keys.publicKey, this.sessionId, signed);
      if (this.hooks.isClosed()) {
        return;
      }
      if (problem === null) {
        console.error('Interview host: ignored a problem that the interviewer key did not sign for this session');
        return;
      }
      this.publish(signed, problem);
    });
  }

  private heldRev(): number {
    return this.signed?.rev ?? NO_PROBLEM_REV;
  }

  /** Runs `task` after every earlier task; a failure is logged, so the chain never rejects. */
  private enqueue(task: () => Promise<void>): Promise<void> {
    this.chain = this.chain
      .then(task)
      .catch((error: unknown) => console.error('Interview host: a problem change failed', error));
    return this.chain;
  }

  /** Numbers, signs and publishes problem; the revision is read here, inside the chain, so it is current. */
  private async publishEdit(problem: InterviewProblem): Promise<void> {
    if (this.hooks.isClosed()) {
      return;
    }
    const rev = this.heldRev() + 1;
    try {
      const signed = await signProblemAt(this.keys.privateKey, this.sessionId, rev, problem);
      if (!this.hooks.isClosed()) {
        this.publish(signed, problem);
      }
    } catch (error) {
      console.error('Interview host: could not sign a problem edit', error);
    }
  }

  private publish(signed: SignedProblem, problem: InterviewProblem): void {
    this.signed = signed;
    this.hooks.onPublished(signed, problem);
  }
}
