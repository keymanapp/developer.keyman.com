import { AuthGuard } from './auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

describe('AuthGuard', () => {
  it('should be defined', () => {
    expect(new AuthGuard()).toBeDefined();
  });

  it('should activate if session has login', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/foo',
      session: { login: 'foo' },
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(new AuthGuard().canActivate(context)).toBeTruthy();
  });

  it('should not activate if session has no login', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/foo',
      session: { login: undefined },
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(new AuthGuard().canActivate(context)).toBeFalsy();
  });

  it.each([['/api/auth/login'], ['/api/auth/user']])(
    'should activate if in auth module (%s) and no login', (url) => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url,
      session: { login: undefined },
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(new AuthGuard().canActivate(context)).toBeTruthy();
  });

  it.each([['/api/auth/login'], ['/api/auth/user']])(
    'should activate if in auth module (%s) and have login', (url) => {
      const mockRequest = jest.fn<any, any[]>(() => ({
        url,
        session: { login: 'foo' },
      }));
      const Mock = jest.fn<ExecutionContext, any[]>(() => ({
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
          getRequest: mockRequest,
          getResponse: jest.fn(),
          getNext: jest.fn(),
        })),
        switchToWs: jest.fn(),
      }));
      const context = new Mock();

      expect(new AuthGuard().canActivate(context)).toBeTruthy();
    },
  );

});
