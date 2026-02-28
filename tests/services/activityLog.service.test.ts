import prisma from "../../src/prisma/client";
import * as activityLog from "../../src/services/activityLog.service";

jest.mock("../../src/prisma/client", () => ({
  activityLog: { create: jest.fn() },
}));

describe("activityLog service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("forwards create parameters to prisma.activityLog.create", async () => {
    const params = {
      userId: 1,
      action: "TEST_ACTION",
      entity: "Foo",
      entityId: 42,
      details: "some details",
    };

    (prisma.activityLog.create as jest.Mock).mockResolvedValue({ id: 10, ...params });

    const result = await activityLog.create(params);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        user: { connect: { id: params.userId } },
      },
    });
    expect(result).toEqual({ id: 10, ...params });
  });
});
